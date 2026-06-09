import { Pipe, type PipeTransform } from '@angular/core';
import { formatMoney } from '../../core/util/money';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatMoney(value ?? 0);
  }
}
