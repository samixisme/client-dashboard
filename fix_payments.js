const fs = require('fs');
let content = fs.readFileSync('pages/admin/AdminPaymentsPage.tsx', 'utf8');
content = content.replace(
  /accessorFn: \(row: T\) => \('invoiceNumber' in row \? row\.invoiceNumber : 'estimateNumber' in row \? row\.estimateNumber : row\.id\)/,
  "accessorFn: (row: T) => ('invoiceNumber' in row ? row.invoiceNumber : 'estimateNumber' in row ? row.estimateNumber : (row as unknown as Invoice | Estimate).id)"
);
fs.writeFileSync('pages/admin/AdminPaymentsPage.tsx', content);
