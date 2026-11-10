import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  // Date.UTC diễn giải các năm 0-99 thành 1900-1999, nên phải đặt năm riêng.
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function IsNotBeforeDate(
  minimumDate: string,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isNotBeforeDate',
      target: object.constructor,
      propertyName,
      constraints: [minimumDate],
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          // Để @IsDateString chịu trách nhiệm báo lỗi định dạng.
          if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
            return true;
          }
          if (!isRealDate(value)) {
            return true;
          }
          return value >= minimumDate;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} không được trước ngày ${minimumDate}`;
        },
      },
    });
  };
}
