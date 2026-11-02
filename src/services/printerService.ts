import { LABELS } from '../data/labels.mm'
import { fmtMMK } from '../utils/mmk'
import type { SaleReceipt } from '../types/domain'

/**
 * PrinterService interface + implementations (research R7 / FR-011).
 * Today: WebPrintService (system print dialog). Later: BluetoothPrinterService
 * (ESC/POS) — swap in registerPrinter() without changing any caller.
 */
export interface PrinterService {
  print(receipt: SaleReceipt): Promise<void>
}

export class WebPrintService implements PrinterService {
  async print(receipt: SaleReceipt): Promise<void> {
    const node = document.createElement('div')
    node.id = 'print-receipt'
    node.innerHTML = renderReceiptHtml(receipt)
    document.body.appendChild(node)
    try {
      window.print()
    } finally {
      // Defer removal until after print dialog closes the event loop tick
      setTimeout(() => node.remove(), 500)
    }
  }
}

/** Stub (not registered by default) for the future Bluetooth ESC/POS path. */
export class BluetoothPrinterService implements PrinterService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async print(_receipt: SaleReceipt): Promise<void> {
    // Future: cut/initialize + line-by-line bytes over Web Bluetooth
    throw new Error('Bluetooth printer not integrated yet (BM: ဘလူးတူး ပရင့် မချိတ်ထားပါ)')
  }
}

let active: PrinterService = new WebPrintService()

export function registerPrinter(service: PrinterService): void {
  active = service
}

export function printReceipt(receipt: SaleReceipt): Promise<void> {
  return active.print(receipt)
}

/** Pure formatter, shared between print channels and tests. */
export function buildReceipt(
  order: { createdAt: string; completedByName: string; items: { nameSnapshot: string; qty: number; unitPriceMmk: number; lineTotalMmk: number }[]; totalMmk: number }
): SaleReceipt {
  return {
    header: { shopName: LABELS.shopName, saleTime: order.createdAt, completedByName: order.completedByName },
    items: order.items.map((i) => ({ name: i.nameSnapshot, qty: i.qty, unitPriceMmk: i.unitPriceMmk, lineTotalMmk: i.lineTotalMmk })),
    totalMmk: order.totalMmk,
  }
}

export function renderReceiptHtml(r: SaleReceipt): string {
  const lines = r.items
    .map(
      (i) =>
        `<tr><td>${escapeHtml(i.name)}</td><td class="num">${i.qty}</td><td class="num">${fmtMMK(i.unitPriceMmk)}</td><td class="num">${fmtMMK(i.lineTotalMmk)}</td></tr>`
    )
    .join('')
  const date = new Date(r.header.saleTime)
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `
    <div style="font-family:'Padauk',sans-serif; font-size:16px; max-width:320px;">
      <h2 style="text-align:center; margin:0">${escapeHtml(LABELS.receiptTitle)} – ${escapeHtml(r.header.shopName)}</h2>
      <p style="margin:4px 0">${LABELS.receiptDate}: ${dateStr}</p>
      <p style="margin:4px 0">${LABELS.receiptSeller}: ${escapeHtml(r.header.completedByName)}</p>
      <table style="width:100%; border-collapse:collapse; margin-top:8px">
        <thead><tr><th align="left">ပစ္စည်း</th><th>အရေအတွက်</th><th>တန်ဖိုး</th><th>ကျသင့်</th></tr></thead>
        <tbody>${lines}</tbody>
      </table>
      <p style="text-align:right; font-size:20px; font-weight:700">${LABELS.total}: ${fmtMMK(r.totalMmk)}</p>
      <p style="text-align:center">${LABELS.receiptThanks}</p>
    </div>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
