import { extname } from 'node:path'

type ClosingContext = 'operand' | 'statement'
interface ScopedContext { depth: number, after: ClosingContext }
type Delimiter
  = | { close: ')' | ']', after: ClosingContext }
    | { close: '}', after: ClosingContext, content: 'statements' | 'expression' }
    | { close: ')', after: 'function', body: ClosingContext }

class FirstLineCommentScanner {
  private index = 0
  private comment = -1
  private readonly source: string
  private readonly dialect: 'js' | 'jsx' | 'ts' | 'tsx'

  constructor(code: string, path: string) {
    this.source = code.split(/[\r\n\u2028\u2029]/, 1)[0]
    const extension = extname(path).toLowerCase()
    this.dialect = extension === '.tsx' ? 'tsx' : extension === '.jsx' ? 'jsx' : ['.ts', '.mts', '.cts'].includes(extension) ? 'ts' : 'js'
  }

  scan(): number {
    this.scanCode()
    return this.comment
  }

  private stopAtComment(): boolean {
    if (this.source.startsWith('/*', this.index)) {
      this.comment = this.index
      this.index = this.source.length
      return true
    }
    if (this.source.startsWith('//', this.index)) {
      this.index = this.source.length
      return true
    }
    return false
  }

  private scanQuoted(quote: string, escapes = true): void {
    this.index++
    while (this.index < this.source.length) {
      const char = this.source[this.index++]
      if (char === '\\' && escapes)
        this.index++
      else if (char === quote)
        return
    }
  }

  private scanRegExp(): void {
    this.index++
    let characterClass = false
    while (this.index < this.source.length) {
      const char = this.source[this.index++]
      if (char === '\\') {
        this.index++
      }
      else if (char === '[') {
        characterClass = true
      }
      else if (char === ']') {
        characterClass = false
      }
      else if (char === '/' && !characterClass) {
        this.index += this.source.slice(this.index).match(/^[\p{ID_Continue}$\u200C\u200D]*/u)?.[0].length ?? 0
        return
      }
    }
  }

  private scanTemplate(): void {
    this.index++
    while (this.index < this.source.length) {
      const char = this.source[this.index++]
      if (char === '\\') {
        this.index++
      }
      else if (char === '`') {
        return
      }
      else if (char === '$' && this.source[this.index] === '{') {
        this.index++
        this.scanCode('}')
      }
    }
  }

  private hasArrowAfterParameters(start: number): boolean {
    const index = this.index
    const comment = this.comment
    try {
      this.index = start
      while (/\s/.test(this.source[this.index] ?? ''))
        this.index++
      if (this.source[this.index] !== '(')
        return false
      this.index++
      if (!this.scanCode(')'))
        return false
      while (/\s/.test(this.source[this.index] ?? ''))
        this.index++
      if (this.source.startsWith('=>', this.index))
        return true
      if (this.source[this.index] !== ':')
        return false
      this.index++
      return this.scanCode('=>')
    }
    finally {
      this.index = index
      this.comment = comment
    }
  }

  private isTypeParameterList(): boolean {
    let depth = 0
    let nested = 0
    let header = ''
    for (let cursor = this.index; cursor < this.source.length; cursor++) {
      const char = this.source[cursor]
      if (char === '"' || char === '\'' || char === '`') {
        const quote = char
        while (++cursor < this.source.length) {
          if (this.source[cursor] === '\\')
            cursor++
          else if (this.source[cursor] === quote)
            break
        }
        continue
      }
      if ('([{'.includes(char)) {
        nested++
      }
      else if (')]}'.includes(char)) {
        nested--
      }
      else if (char === '<') {
        depth++
      }
      else if (char === '>' && this.source[cursor - 1] !== '=') {
        if (--depth === 0) {
          return /\bextends\b|=/.test(header) && this.hasArrowAfterParameters(cursor + 1)
        }
      }
      else if (depth === 1 && nested === 0 && char === ',') {
        return true
      }
      header += char
    }
    return false
  }

  private scanTypeArguments(): void {
    let depth = 0
    while (this.index < this.source.length) {
      if (this.stopAtComment())
        return
      const char = this.source[this.index]
      if (char === '"' || char === '\'') {
        this.scanQuoted(char)
      }
      else if (char === '`') {
        this.scanTemplate()
      }
      else {
        this.index++
        if (char === '<')
          depth++
        else if (char === '>' && this.source[this.index - 2] !== '=' && --depth === 0)
          return
      }
    }
  }

  private scanJSX(): void {
    let depth = 0
    while (this.index < this.source.length) {
      const char = this.source[this.index]
      if (char === '<') {
        const closing = this.source[this.index + 1] === '/'
        this.index += closing ? 2 : 1
        while (this.index < this.source.length) {
          if (this.stopAtComment())
            return
          const tagChar = this.source[this.index]
          if (tagChar === '"' || tagChar === '\'') {
            this.scanQuoted(tagChar, false)
          }
          else if (tagChar === '{') {
            this.index++
            this.scanCode('}')
          }
          else if (tagChar === '<' && this.dialect === 'tsx') {
            this.scanTypeArguments()
          }
          else if (tagChar === '>') {
            const selfClosing = this.source[this.index - 1] === '/'
            this.index++
            depth += closing ? -1 : selfClosing ? 0 : 1
            if (depth === 0)
              return
            break
          }
          else {
            this.index++
          }
        }
      }
      else if (char === '{') {
        this.index++
        this.scanCode('}')
      }
      else {
        this.index++
      }
    }
  }

  private isStatementStart(previous: string, delimiters: Delimiter[]): boolean {
    if (previous === '{') {
      const delimiter = delimiters.at(-1)
      return delimiter?.close === '}' && delimiter.content === 'statements'
    }
    return previous === '' || /^(?:;|\}block|\)control|:statement|else|do|catch|export|declare|default)$/.test(previous)
  }

  private scanCode(end?: '}' | ')' | '=>'): boolean {
    const delimiters: Delimiter[] = []
    let regexpAllowed = true
    let previous = end ? '(' : ''
    let beforeWord = ''
    let asyncFunctionGoal: ClosingContext = 'operand'
    const functionBodies: ScopedContext[] = []
    let pendingFunction: ScopedContext | undefined
    const declarations: ScopedContext[] = []
    const caseExpressions: { depth: number, conditionals: number }[] = []
    while (this.index < this.source.length) {
      const char = this.source[this.index]
      if (/\s/.test(char)) {
        this.index++
        continue
      }
      if (this.index === 0 && this.source.startsWith('#!')) {
        this.index = this.source.length
        return false
      }
      if (this.stopAtComment())
        return false
      if (end && this.source.startsWith(end, this.index) && delimiters.length === 0) {
        this.index += end.length
        return true
      }
      if (char === '<' && regexpAllowed && this.dialect === 'js') {
        this.index = this.source.length
        return false
      }
      if (char === '"' || char === '\'') {
        this.scanQuoted(char)
      }
      else if (char === '`') {
        this.scanTemplate()
      }
      else if (char === '/' && regexpAllowed) {
        this.scanRegExp()
      }
      else if (char === '<' && (pendingFunction?.depth === delimiters.length || declarations.at(-1)?.depth === delimiters.length || functionBodies.at(-1)?.depth === delimiters.length) && (this.dialect === 'ts' || this.dialect === 'tsx')) {
        this.scanTypeArguments()
        regexpAllowed = false
        continue
      }
      else if (char === '<' && regexpAllowed && (this.dialect === 'jsx' || this.dialect === 'tsx') && /^[$_\p{ID_Start}>]/u.test(this.source.slice(this.index + 1))) {
        if (this.dialect === 'tsx' && this.isTypeParameterList()) {
          this.scanTypeArguments()
          previous = '<types>'
          regexpAllowed = true
          continue
        }
        this.scanJSX()
      }
      else {
        const word = this.source.slice(this.index).match(/^[$_\p{ID_Start}][$\u200C\u200D\p{ID_Continue}]*/u)?.[0]
        if (word) {
          const property = previous === '.'
          const declarationGoal = regexpAllowed && !this.isStatementStart(previous, delimiters) ? 'operand' : 'statement'
          const following = this.source.slice(this.index + word.length)
          if (word === 'async' && !property)
            asyncFunctionGoal = declarationGoal
          if (word === 'function' && !property && /^\s*[$_\p{ID_Start}*(<\\]/u.test(following))
            pendingFunction = { depth: delimiters.length, after: previous === 'async' ? asyncFunctionGoal : declarationGoal }
          if (word === 'class' && !property && /^\s*[$_\p{ID_Start}<{\\]/u.test(following))
            declarations.push({ depth: delimiters.length, after: declarationGoal })
          if ((this.dialect === 'ts' || this.dialect === 'tsx') && /^(?:interface|enum|namespace|module)$/.test(word) && (this.isStatementStart(previous, delimiters) || (word === 'enum' && previous === 'const')) && /^\s*[$_\p{ID_Start}"']/u.test(following))
            declarations.push({ depth: delimiters.length, after: 'statement' })
          if ((this.dialect === 'ts' || this.dialect === 'tsx') && word === 'global' && previous === 'declare')
            declarations.push({ depth: delimiters.length, after: 'statement' })
          if (word === 'case' && this.isStatementStart(previous, delimiters))
            caseExpressions.push({ depth: delimiters.length, conditionals: 0 })
          regexpAllowed = !property && /^(?:return|throw|case|delete|void|typeof|new|yield|await|in|instanceof|of|else|do|extends|default)$/.test(word)
          beforeWord = previous
          previous = property ? '.property' : word
          this.index += word.length
          continue
        }
        const number = this.source.slice(this.index).match(/^(?:\d[\w.]*|\.\d[\w.]*)/)?.[0]
        if (number) {
          this.index += number.length
          beforeWord = previous
          previous = 'operand'
          regexpAllowed = false
          continue
        }
        if (char === '(') {
          if (pendingFunction?.depth === delimiters.length) {
            delimiters.push({ close: ')', after: 'function', body: pendingFunction.after })
            pendingFunction = undefined
          }
          else {
            delimiters.push({ close: ')', after: /^(?:if|while|for|with|switch|catch)$/.test(previous) || (previous === 'await' && beforeWord === 'for') ? 'statement' : 'operand' })
          }
        }
        else if (char === '[') {
          delimiters.push({ close: ']', after: 'operand' })
        }
        else if (char === '{') {
          const declaration = declarations.at(-1)
          const functionBody = functionBodies.at(-1)
          let block = this.isStatementStart(previous, delimiters) || /^(?:\)|=>|try|finally)$/.test(previous)
          let after: ClosingContext = block && previous !== '=>' ? 'statement' : 'operand'
          if (functionBody?.depth === delimiters.length && !/^[:|&?]$/.test(previous)) {
            block = true
            after = functionBody.after
            functionBodies.pop()
          }
          else if (declaration?.depth === delimiters.length && !regexpAllowed) {
            block = true
            after = declaration.after
            declarations.pop()
          }
          delimiters.push({ close: '}', after, content: block ? 'statements' : 'expression' })
        }
        else if (char === ')' || char === ']' || char === '}') {
          const delimiter = delimiters.pop()
          if (!delimiter || delimiter.close !== char) {
            this.index = this.source.length
            return false
          }
          if (delimiter.after === 'function')
            functionBodies.push({ depth: delimiters.length, after: delimiter.body })
          for (const scopes of [functionBodies, declarations, caseExpressions]) {
            while ((scopes.at(-1)?.depth ?? -1) > delimiters.length)
              scopes.pop()
          }
          if (pendingFunction && pendingFunction.depth > delimiters.length)
            pendingFunction = undefined
          regexpAllowed = delimiter.after === 'statement'
          previous = char === ')' && regexpAllowed ? ')control' : char === '}' && regexpAllowed ? '}block' : char
          this.index++
          continue
        }
        if (char === ';') {
          for (const scopes of [functionBodies, declarations, caseExpressions]) {
            while ((scopes.at(-1)?.depth ?? -1) >= delimiters.length)
              scopes.pop()
          }
          if (pendingFunction && pendingFunction.depth >= delimiters.length)
            pendingFunction = undefined
        }
        const operator = this.source.slice(this.index).match(/^(?:<<=?|>>>?=?|\|\|=?|&&=?|\?\?=?|=>|\+\+|--|\?\.|\.\.\.)/)?.[0] ?? char
        this.index += operator.length
        regexpAllowed = operator !== '.' && operator !== '?.' && operator !== '++' && operator !== '--'
        const caseExpression = caseExpressions.at(-1)
        if (operator === '?' && caseExpression?.depth === delimiters.length)
          caseExpression.conditionals++
        if (operator === ':' && caseExpression?.depth === delimiters.length) {
          if (caseExpression.conditionals > 0) {
            caseExpression.conditionals--
          }
          else {
            caseExpressions.pop()
            previous = ':statement'
            continue
          }
        }
        previous = operator === ':' && this.isStatementStart(beforeWord, delimiters) ? ':statement' : operator === '?.' ? '.' : operator
        continue
      }
      regexpAllowed = false
      previous = 'operand'
    }
    return false
  }
}

export function findFirstLineBlockComment(code: string, path: string): number {
  return new FirstLineCommentScanner(code, path).scan()
}
