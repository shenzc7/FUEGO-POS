import React from 'react';
import { usePOS } from '../context/POSContext';

/**
 * Special component for Thermal Printing (80mm)
 * Styled via CSS in index.css @media print
 */
export const ThermalReceipt = ({ data, type = 'INVOICE' }) => {
  const { settings } = usePOS();

  // Never render (and therefore never try to print) empty or invalid data.
  if (!data || !Array.isArray(data.items) || data.items.length === 0) return null;

  const receiptSettings = data.receiptSettings || settings;
  const showGST = receiptSettings.gstEnabled !== undefined ? receiptSettings.gstEnabled : settings.gstEnabled;
  const isKOT = type === 'KOT';
  const isEstimate = type === 'ESTIMATE';
  const showPricing = !isKOT;
  const showPaymentSection = !isKOT && !isEstimate;
  const printedAt = data.timestamp ? new Date(data.timestamp) : new Date();
  const documentTitle = isKOT
    ? '*** KITCHEN ORDER TICKET ***'
    : isEstimate
      ? '--- ESTIMATE / PREVIEW ---'
      : data.payment?.status === 'Paid'
        ? '--- CASH MEMO ---'
        : '--- DUE BILL ---';
  const referenceLabel = isKOT ? 'KOT REF' : isEstimate ? 'EST REF' : 'BILL REF';
  const paymentMethod = data.payment?.method || 'DIRECT';
  const displayedPaidAmount = data.payment?.amountPaid || data.total || 0;
  const displayedTenderedAmount =
    data.payment?.tenderedAmount ??
    (data.payment?.change > 0 && displayedPaidAmount > 0
      ? displayedPaidAmount + data.payment.change
      : displayedPaidAmount);

  const is58mm = receiptSettings.paperWidth?.includes('58mm');
  const isRP326 = receiptSettings.printerModel === 'RP326';

  return (
    <div className={`print-only thermal-receipt ${is58mm ? 'width-58mm' : ''} ${isRP326 ? 'is-rp326' : ''}`}>
      {/* 1. Header Section */}
      <div className="receipt-header">
        {settings.logo && (
          <img src={settings.logo} alt="Logo" className="receipt-logo" />
        )}
        <h1>{receiptSettings.restaurantName || 'FUEGO'}</h1>
        <div style={{ fontSize: '10px' }}>
          {receiptSettings.address && <div>{receiptSettings.address}</div>}
          {receiptSettings.phone && <div>TEL: {receiptSettings.phone}</div>}
          {showGST && receiptSettings.gstNumber && <div style={{ fontWeight: 'bold', marginTop: '1mm' }}>GSTIN: {receiptSettings.gstNumber}</div>}
        </div>
      </div>

      <div className="receipt-divider" />

      {/* 2. Mode Title */}
      <div className="text-center" style={{ margin: '2mm 0' }}>
        <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '1mm 0', fontWeight: 'bold' }}>
          {documentTitle}
        </div>
      </div>

      {/* 3. Meta Data */}
      <div style={{ fontSize: '11px', marginBottom: '2mm' }}>
        <div className="flex justify-between">
          <span>DATE: {printedAt.toLocaleDateString()}</span>
          <span>TIME: {printedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
        </div>
        <div style={{ textAlign: 'center', margin: '1mm 0', fontWeight: 'bold', fontSize: '14px' }}>
          {referenceLabel}: {data.id}
        </div>
        {data.tableNumber && (
          <div style={{ fontSize: '16px', fontWeight: 'bold', border: '1px solid #000', textAlign: 'center', margin: '1mm 0', padding: '1mm' }}>
            TABLE: {data.tableNumber}
          </div>
        )}
        {data.customerName && (
          <div style={{ borderBottom: '1px dashed #000', paddingBottom: '1mm' }}>
            GUEST: {data.customerName}
          </div>
        )}
      </div>

      {/* 4. Items List */}
      <table className="receipt-table" style={{ fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>ITEM</th>
            <th style={{ width: '8mm', textAlign: 'center' }}>QTY</th>
            {showPricing && <th style={{ width: '20mm', textAlign: 'right' }}>PRICE</th>}
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => {
            const name = item.name || '—';
            const qty = Math.max(1, Number(item.quantity) || 1);
            const price = Number(item.price) || 0;
            return (
              <React.Fragment key={idx}>
                <tr style={{ verticalAlign: 'top' }}>
                  <td style={{ fontWeight: isKOT ? 'bold' : 'normal', fontSize: isKOT ? '14px' : '12px' }}>
                    {name}
                    {item.note ? (
                      <div style={{ fontSize: '10px', fontStyle: 'italic', textTransform: 'none' }}>
                        -- {item.note}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ width: '8mm', textAlign: 'center', fontWeight: 'bold', fontSize: isKOT ? '16px' : '12px' }}>
                    {qty}
                  </td>
                  {showPricing && (
                    <td style={{ width: '20mm', textAlign: 'right', fontWeight: 'bold' }}>
                      ₹{(price * qty).toFixed(2)}
                    </td>
                  )}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {showPricing && (
        /* Totals block — must never be split across pages */
        <div className="receipt-totals-block">
          <div className="receipt-divider" />

          {/* 6. Totals Section */}
          <div style={{ fontSize: '11px' }}>
            <div className="flex justify-between">
              <span>SUBTOTAL:</span>
              <span>₹{(data.subtotal || 0).toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between" style={{ fontStyle: 'italic' }}>
                <span>DISCOUNT:</span>
                <span>-₹{data.discount.toFixed(2)}</span>
              </div>
            )}
            {showGST && (
              <div className="flex justify-between">
                <span>GST ({receiptSettings.gstRate || 5}%):</span>
                <span>₹{(data.gst || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="receipt-divider-solid" />
            <div className="flex justify-between" style={{ fontSize: '16px', fontWeight: 'bold' }}>
              <span>TOTAL:</span>
              <span>₹{(data.total || 0).toFixed(2)}</span>
            </div>
            <div className="receipt-divider-solid" />

            {showPaymentSection ? (
              <div style={{ marginTop: '2mm' }}>
                {/* Split payments: show each method and its amount individually */}
                {paymentMethod === 'Split' && Array.isArray(data.payment?.splits) && data.payment.splits.length > 0 ? (
                  data.payment.splits.map((split, i) => (
                    <div key={i} className="flex justify-between">
                      <span>PAID VIA {split.method}:</span>
                      <span>₹{Number(split.amount || 0).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>PAID VIA {paymentMethod}:</span>
                      <span>₹{displayedPaidAmount.toFixed(2)}</span>
                    </div>
                    {displayedTenderedAmount > displayedPaidAmount && (
                      <>
                        <div className="flex justify-between">
                          <span>CASH RECEIVED:</span>
                          <span>₹{displayedTenderedAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CHANGE RETURNED:</span>
                          <span>₹{(data.payment?.change || 0).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
                {data.payment?.due > 0 && (
                  <div className="flex justify-between" style={{ fontWeight: 'bold', marginTop: '1mm', padding: '1mm 0', border: '1px solid #000' }}>
                    <span>DUE BALANCE:</span>
                    <span>₹{data.payment?.due.toFixed(2)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: '2mm', border: '1px dashed #000', padding: '1.5mm', textAlign: 'center', fontWeight: 'bold' }}>
                PREVIEW ONLY. FINAL BILL IS GENERATED AT PAYMENT.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Footer Section — must never be split across pages */}
      <div className="receipt-footer-block" style={{ textAlign: 'center', fontSize: '10px' }}>
        <div className="receipt-divider" />
        <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>
          {isKOT ? 'SEND TO KITCHEN' : isEstimate ? 'ESTIMATE ONLY' : 'THANK YOU FOR VISITING!'}
        </div>
        <div>{isKOT ? 'PREPARE AS LISTED ABOVE' : isEstimate ? 'NOT A FINAL TAX INVOICE' : 'PLEASE VISIT AGAIN'}</div>

        {isRP326 && (
          <div style={{ marginTop: '2mm', fontSize: '8px', borderTop: '1px solid #000', paddingTop: '1mm', opacity: 0.8 }}>
            HARDWARE: RUGTEK RP326 (80MM v2.0)
          </div>
        )}

        <div style={{ marginTop: '4mm', fontSize: '8px', opacity: 0.5, display: 'flex', justifyContent: 'space-between' }}>
          <span>FUEGO POS V2</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};
