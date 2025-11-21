import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsEmailUnlessAdmin(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isEmailUnlessAdmin',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          if (value === 'admin') return true;

          // Basic email regex (you can replace it with a more robust one or use validator.js)
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `"${args.property}" must be a valid email unless it's "admin"`;
        },
      },
    });
  };
}
