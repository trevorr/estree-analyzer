const TokenKind = {
  Leading: 0,
  Normal: 1,
  Trailing: 2,
  Space: 3
};

export class Formatter {
  constructor(options = {}) {
    this._write = options.write || process.stdout.write.bind(process.stdout);
    this._indentChar = options.indentChar || ' ';
    this._indentMultiple = options.indentMultiple || 2;
    this._margin = options.margin || 80;
    this._indent = 0;
    this._tokens = [];
    this._kinds = [];
  }
  flush() {
    if (this._tokens.length) {
      this.emitNewline();
    }
  }
  emitLeading(token) {
    this._tokens.push(token);
    this._kinds.push(TokenKind.Leading);
  }
  emit(token) {
    this._tokens.push(token);
    this._kinds.push(TokenKind.Normal);
  }
  emitTrailing(token) {
    this._tokens.push(token);
    this._kinds.push(TokenKind.Trailing);
  }
  emitSpace(token = ' ') {
    this._tokens.push(token);
    this._kinds.push(TokenKind.Space);
  }
  emitSemi() {
    this.emitTrailing(';');
  }
  emitNewline() {
    // calculate indent parameters
    const indentWidth = this._indentChar === '\t' ? 8 : this._indentChar.length;
    const indentCount = this._indent * this._indentMultiple;

    let done = false;
    do {
      // drop leading spaces
      while (this._kinds[0] === TokenKind.Space) {
        this._tokens.shift();
        this._kinds.shift();
      }

      // don't indent empty lines
      if (!this._kinds.length) {
        this._write('\n');
        return;
      }

      let line = this._indentChar.repeat(indentCount);
      let col = indentCount * indentWidth;

      // always write first normal token and its trailing tokens
      const length = this._kinds.length;
      let gotNormal = false;
      let pos = 0;
      let lastNonspacePos = -1;
      while (pos < length) {
        const kind = this._kinds[pos];
        if (gotNormal && kind !== TokenKind.Trailing) break;
        if (kind === TokenKind.Normal) gotNormal = true;
        if (kind !== TokenKind.Space) lastNonspacePos = pos;
        col += this._tokens[pos].length;
        ++pos;
      }

      // find next normal token beyond margin
      let lastWritePos = lastNonspacePos;
      let lastNormalOrTrailing = false;
      while (pos < length) {
        const kind = this._kinds[pos];
        col += this._tokens[pos].length;
        if (kind === TokenKind.Normal) {
          if (col > this._margin) break;
          lastNormalOrTrailing = true;
          lastWritePos = lastNonspacePos = pos;
        } else if (kind === TokenKind.Trailing && lastNormalOrTrailing) {
          lastWritePos = lastNonspacePos = pos;
        } else {
          lastNormalOrTrailing = false;
          if (kind !== TokenKind.Space) {
            lastNonspacePos = pos;
          }
        }
        ++pos;
      }

      // reached end of line: accept all but trailing spaces
      if (pos === length) {
        lastWritePos = lastNonspacePos;
        done = true;
      }

      for (let i = 0; i <= lastWritePos; ++i) {
        line += this._tokens.shift();
        this._kinds.shift();
      }

      line += '\n';
      this._write(line);
    } while (!done);
  }
  emitBinaryOp(token) {
    this.emitSpace();
    this.emitTrailing(token);
    this.emitSpace();
  }
  incIndent() {
    ++this._indent;
  }
  decIndent() {
    --this._indent;
  }
}
