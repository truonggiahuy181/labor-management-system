import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getTodayInVietnam(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${valueOf('year')}-${valueOf('month')}-${valueOf('day')}`;
}

export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName,
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
          return value <= getTodayInVietnam();
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} không được là ngày trong tương lai`;
        },
      },
    });
  };
}
