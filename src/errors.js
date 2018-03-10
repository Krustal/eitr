export class InvalidField extends Error {
  constructor(field, ...params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(`Attempted to set undefined field "${field}"`, ...params);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidField);
    }

    // Custom debugging information
    this.field = field;
  }
}

export class InvalidChoice extends Error {
  constructor(field, value, reason, ..._params) {
    super(`Attempted to choose [${value}] for [${field}], ${reason}`);

    if (Error.captureStackTrace) Error.captureStackTrace(this, InvalidChoice);

    this.field = field;
    this.value = value;
    this.reason = reason;
  }
}
