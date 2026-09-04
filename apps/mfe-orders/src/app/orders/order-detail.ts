import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrdersApi } from './orders-api';

@Component({
  selector: 'mfe-orders-order-detail',
  imports: [RouterLink, DecimalPipe, DatePipe],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail {
  private readonly api = inject(OrdersApi);
  private readonly route = inject(ActivatedRoute);

  // Read through ActivatedRoute rather than a component input: input binding is
  // a router feature the host configures, and this remote must work whatever
  // the host chose.
  private readonly orderId = this.route.snapshot.paramMap.get('orderId') ?? '';

  readonly order = computed(() => this.api.byId(this.orderId));
}
