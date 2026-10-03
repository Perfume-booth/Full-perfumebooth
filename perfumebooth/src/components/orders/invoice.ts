const stateCodes: Record<string, string> = {
  "delhi": "07",
  "uttar pradesh": "09",
  "haryana": "06",
  "maharashtra": "27",
  "karnataka": "29",
  "tamil nadu": "33",
  "west bengal": "19",
  "rajasthan": "08",
  "gujarat": "24",
  "punjab": "03",
  "telangana": "36",
  "andhra pradesh": "37",
  "bihar": "10",
  "madhya pradesh": "23",
  "kerala": "32",
  "assam": "18",
  "odisha": "21"
};

const getStateCode = (state: string) => {
  const normalized = (state || "").trim().toLowerCase();
  return stateCodes[normalized] || "09";
};

export const downloadInvoice = async (order: any, trackingInfo: any) => {
  // Dynamic import to prevent SSR issues in Next.js
  const html2pdf = (await import("html2pdf.js")).default;
  const lineItems = order.lineItems?.edges.map((e: any) => e.node) || [];

  const stateCode = getStateCode(order.shippingAddress?.province);
  const invoiceDate = new Date(order.processedAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const courier = trackingInfo?.courierName || "Xpressbees Surface";
  const awb = trackingInfo?.trackingNumber || trackingInfo?.awbNo || "14112365485111";
  const payMethod = order.financialStatus === "PAID" ? "prepaid" : "cod";

  const itemsRows = lineItems.map((item: any, idx: number) => {
    const price = parseFloat(item.variant?.price?.amount || item.variant?.price || "0");
    const discount = parseFloat(item.discountAllocations?.[0]?.amount?.amount || "0");
    const taxable = (price * item.quantity) - discount;
    return `
      <tr style="border-bottom: 1px solid #e5e5e5; font-size: 11px;">
        <td style="padding: 12px 6px; text-align: center; color: #555;">${idx + 1}</td>
        <td style="padding: 12px 6px; font-weight: bold; color: #222;">
          ${item.title}
          <div style="font-size: 9px; color: #666; margin-top: 4px; font-weight: normal;">SKU : ${item.variant?.sku || "N/A"}</div>
        </td>
        <td style="padding: 12px 6px; text-align: center; color: #555;">N/A</td>
        <td style="padding: 12px 6px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 6px; text-align: right;">Rs. ${price.toFixed(2)}</td>
        <td style="padding: 12px 6px; text-align: right;">${discount.toFixed(2)}</td>
        <td style="padding: 12px 6px; text-align: right;">${taxable.toFixed(2)}</td>
        <td style="padding: 12px 6px; text-align: center; color: #555;">0 | 0</td>
        <td style="padding: 12px 6px; text-align: right; font-weight: bold;">${taxable.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  const shippingCharge = parseFloat(order.totalShipping || "0");

  // Create container element for HTML conversion to PDF
  const element = document.createElement("div");
  element.style.fontFamily = "'Outfit', sans-serif";
  element.style.padding = "20px";
  element.style.color = "#222";
  element.style.backgroundColor = "#fff";

  element.innerHTML = `
    <div style="max-width: 900px; margin: 0 auto; padding: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <svg viewBox="0 0 500 120" style="width: 320px; height: auto;">
          <g>
            <circle cx="30" cy="66" r="11" fill="#222" />
            <text x="14" y="80" font-family="'Outfit', sans-serif" font-weight="700" font-size="55px" fill="#222">p</text>
            <circle cx="62" cy="60" r="8" fill="#222" />
            <text x="47" y="80" font-family="'Outfit', sans-serif" font-weight="700" font-size="55px" fill="#222">e</text>
            <text x="80" y="80" font-family="'Outfit', sans-serif" font-weight="700" font-size="55px" fill="#222" letter-spacing="1">rfum</text>
            <circle cx="225" cy="60" r="8" fill="#222" />
            <text x="210" y="80" font-family="'Outfit', sans-serif" font-weight="700" font-size="55px" fill="#222">e</text>
            <line x1="213" y1="45" x2="238" y2="45" stroke="#222" stroke-width="4" />
            <circle cx="260" cy="65" r="11" fill="#222" />
            <text x="243" y="80" font-family="'Outfit', sans-serif" font-weight="700" font-size="55px" fill="#222">b</text>
            <circle cx="300" cy="65" r="18" fill="rgba(240, 160, 210, 0.7)" />
            <circle cx="330" cy="65" r="18" fill="rgba(110, 200, 240, 0.7)" />
            <circle cx="315" cy="82" r="18" fill="rgba(250, 220, 90, 0.8)" />
            <text x="360" y="80" font-family="'Outfit', sans-serif" font-weight="700" font-size="55px" fill="#222">th</text>
          </g>
        </svg>
      </div>
      
      <div style="text-align: center; font-size: 28px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; border-top: 2px solid #222; border-bottom: 2px solid #222; padding: 8px 0; margin: 15px 0 25px 0;">Tax Invoice</div>
      
      <div style="display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 11px; line-height: 1.6;">
        <div>
          <div style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px dashed #ccc; padding-bottom: 6px; margin-bottom: 10px; color: #000;">Shipping Address:</div>
          <p style="margin: 4px 0; color: #444;"><strong>${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}</strong></p>
          <p style="margin: 4px 0; color: #444;">${order.shippingAddress?.address1 || ""}</p>
          ${order.shippingAddress?.address2 ? `<p style="margin: 4px 0; color: #444;">${order.shippingAddress.address2}</p>` : ""}
          <p style="margin: 4px 0; color: #444;">${order.shippingAddress?.city || ""}, ${order.shippingAddress?.province || ""} ${order.shippingAddress?.zip || ""}</p>
          <p style="margin: 4px 0; color: #444;">India</p>
          <p style="margin-top: 10px; margin-bottom: 4px; color: #444;"><strong>State Code : ${stateCode}</strong></p>
        </div>
        
        <div style="border-left: 1px dashed #ccc; border-right: 1px dashed #ccc; padding: 0 15px;">
          <div style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px dashed #ccc; padding-bottom: 6px; margin-bottom: 10px; color: #000;">Sold By:</div>
          <p style="margin: 4px 0; color: #444;"><strong>PerfumeBooth Pvt. Ltd.</strong></p>
          <p style="margin: 4px 0; color: #444;">3rd Floor, 70B/35,</p>
          <p style="margin: 4px 0; color: #444;">Rama Road Industrial Area,</p>
          <p style="margin: 4px 0; color: #444;">New Delhi 110015</p>
          <p style="margin: 4px 0; color: #444;">Delhi, India</p>
          <p style="margin: 4px 0; color: #444;"><strong>State Code : 07</strong></p>
          <p style="margin: 4px 0; color: #444;">Ph: 9266030909</p>
          <p style="margin: 4px 0; color: #444;">GSTIN No. 07AAICP6302R1ZX</p>
          <p style="margin: 4px 0; color: #444;">CIN No: U74999DL201PTC301136</p>
          <p style="margin-top: 8px; margin-bottom: 4px; color: #444;">Website: http://www.perfumebooth.com</p>
          <p style="margin: 4px 0; color: #444;">Email: admin@perfumebooth.com</p>
        </div>
        
        <div>
          <div style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px dashed #ccc; padding-bottom: 6px; margin-bottom: 10px; color: #000;">Invoice Details:</div>
          <p style="margin: 4px 0; color: #444;"><strong>INVOICE NO.</strong> : 1000${String(order.id).split('/').pop()?.substring(0, 8) || "5334"}</p>
          <p style="margin: 4px 0; color: #444;"><strong>INVOICE DATE</strong> : ${invoiceDate}</p>
          <p style="margin: 4px 0; color: #444;"><strong>ORDER NO.</strong> : ${order.name}</p>
          <p style="margin: 4px 0; color: #444;"><strong>ORDER DATE</strong> : ${invoiceDate}</p>
          <p style="margin: 4px 0; color: #444;"><strong>CHANNEL</strong> : Perfume Booth Web Store</p>
          <p style="margin: 4px 0; color: #444;"><strong>SHIPPED BY</strong> : ${courier}</p>
          <p style="margin: 4px 0; color: #444;"><strong>AWB NO.</strong> : ${awb}</p>
          <p style="margin: 4px 0; color: #444;"><strong>PAYMENT METHOD</strong> : ${payMethod}</p>
          <p style="margin: 4px 0; color: #444;"><strong>REMARK</strong> : </p>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr>
            <th style="width: 5%; text-align: center; border-bottom: 2px solid #222; padding: 10px 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">S.No.</th>
            <th style="width: 35%; text-align: left; border-bottom: 2px solid #222; padding: 10px 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">Product Name</th>
            <th style="width: 8%; text-align: center; border-bottom: 2px solid #222; padding: 10px 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">HSN</th>
            <th style="width: 6%; text-align: center; border-bottom: 2px solid #222; padding: 10px 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">Qty</th>
            <th style="width: 10%; text-align: right; border-bottom: 2px solid #222; padding: 10px 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">Unit Price</th>
            <th style="width: 10%; text-align: right; border-bottom: 2px solid #222; padding: 10px 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">Unit Discount</th>
            <th style="width: 10%; text-align: right; border-bottom: 2px solid #222; padding: 10px 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">Taxable Value</th>
            <th style="width: 8%; text-align: center; border-bottom: 2px solid #222; padding: 10px 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">IGST (Value | %)</th>
            <th style="width: 10%; text-align: right; border-bottom: 2px solid #222; padding: 10px 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #000; letter-spacing: 0.5px;">Total (Including GST)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
          <tr style="border-bottom: 2px solid #222; font-size: 11px;">
            <td colspan="4" style="padding: 12px 6px;"></td>
            <td colspan="2" style="padding: 12px 6px; text-align: right; color: #555;">Shipping Charges</td>
            <td style="padding: 12px 6px; text-align: right; color: #555;">${shippingCharge.toFixed(2)}</td>
            <td style="padding: 12px 6px; text-align: center; color: #555;">0.00 | 0</td>
            <td style="padding: 12px 6px; text-align: right; font-weight: bold;">${shippingCharge.toFixed(2)}</td>
          </tr>
          <tr style="font-size: 14px; font-weight: 700; border-top: 2px solid #222; border-bottom: 2px solid #222;">
            <td colspan="5" style="border: none; padding: 15px 10px;"></td>
            <td colspan="2" style="text-align: left; text-transform: uppercase; font-size: 14px; font-weight: 700; padding: 15px 10px;">NET TOTAL (In Value)</td>
            <td colspan="2" style="text-align: right; font-size: 16px; font-weight: 900; padding: 15px 10px;">Rs. ${parseFloat(order.totalPrice?.amount || order.totalPrice || "0").toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const opt = {
    margin:       [10, 10, 10, 10] as [number, number, number, number],
    filename:     `Invoice_${order.name.replace("#", "")}.pdf`,
    image:        { type: "jpeg" as const, quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const }
  };

  html2pdf().from(element).set(opt).save();
};
