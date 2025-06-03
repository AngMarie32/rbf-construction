
interface BidItem {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  unit: string;
  unitCost: number;
  quantity: number;
  total: number;
}

interface ProposalData {
  projectName: string;
  client: string;
  scope: string;
  amount: number;
  date: string;
  items?: BidItem[];
  categories?: { category: string; total: number }[];
}

export const generateProposalPDF = (data: ProposalData): void => {
  const content = `
<!DOCTYPE html>
<html>
<head>
    <title>Construction Proposal</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px;
            line-height: 1.6;
        }
        .header { 
            text-align: center; 
            margin-bottom: 40px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .company-name { 
            font-size: 24px; 
            font-weight: bold; 
            color: #333;
        }
        .proposal-title { 
            font-size: 20px; 
            margin-top: 10px;
            color: #666;
        }
        .section { 
            margin: 30px 0; 
        }
        .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            color: #333;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        .project-info { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px;
            margin-bottom: 30px;
        }
        .info-item { 
            margin-bottom: 10px; 
        }
        .label { 
            font-weight: bold; 
            color: #555;
        }
        .value { 
            margin-left: 10px; 
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left;
        }
        th { 
            background-color: #f5f5f5; 
            font-weight: bold;
        }
        .amount { 
            text-align: right; 
            font-weight: bold;
        }
        .total-section { 
            margin-top: 30px; 
            text-align: right;
        }
        .total-amount { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2563eb;
            border-top: 2px solid #333;
            padding-top: 10px;
            margin-top: 10px;
        }
        .footer { 
            margin-top: 50px; 
            text-align: center;
            border-top: 1px solid #ccc;
            padding-top: 20px;
            color: #666;
        }
        .scope-section {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">BuildPro Construction</div>
        <div class="proposal-title">Construction Proposal</div>
    </div>

    <div class="project-info">
        <div>
            <div class="info-item">
                <span class="label">Project:</span>
                <span class="value">${data.projectName}</span>
            </div>
            <div class="info-item">
                <span class="label">Client:</span>
                <span class="value">${data.client}</span>
            </div>
        </div>
        <div>
            <div class="info-item">
                <span class="label">Date:</span>
                <span class="value">${data.date}</span>
            </div>
            <div class="info-item">
                <span class="label">Proposal Total:</span>
                <span class="value amount">$${data.amount.toLocaleString()}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Scope of Work</div>
        <div class="scope-section">
            ${data.scope.split('\n').map(line => `<p>${line}</p>`).join('')}
        </div>
    </div>

    ${data.categories ? `
    <div class="section">
        <div class="section-title">Project Breakdown</div>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${data.categories.map(cat => `
                <tr>
                    <td>${cat.category}</td>
                    <td class="amount">$${cat.total.toLocaleString()}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    ${data.items ? `
    <div class="section">
        <div class="section-title">Detailed Line Items</div>
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Unit</th>
                    <th>Quantity</th>
                    <th>Unit Cost</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${data.items.map(item => `
                <tr>
                    <td>${item.category} - ${item.description}</td>
                    <td>${item.unit}</td>
                    <td>${item.quantity}</td>
                    <td class="amount">$${item.unitCost.toLocaleString()}</td>
                    <td class="amount">$${item.total.toLocaleString()}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="total-section">
        <div class="total-amount">Total Project Cost: $${data.amount.toLocaleString()}</div>
    </div>

    <div class="footer">
        <p>Thank you for considering BuildPro Construction for your project.</p>
        <p>This proposal is valid for 30 days from the date above.</p>
    </div>
</body>
</html>
  `;

  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(content);
    newWindow.document.close();
    newWindow.print();
  }
};

export const generateBidExportPDF = (bidItems: BidItem[], projectName: string): void => {
  const totalAmount = bidItems.reduce((sum, item) => sum + item.total, 0);
  const categorizedItems = bidItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, BidItem[]>);

  const content = `
<!DOCTYPE html>
<html>
<head>
    <title>Bid Export - ${projectName}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px;
            line-height: 1.4;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }
        .company-name { 
            font-size: 24px; 
            font-weight: bold; 
        }
        .project-title { 
            font-size: 18px; 
            margin-top: 10px;
            color: #666;
        }
        .category-section { 
            margin: 25px 0; 
        }
        .category-title { 
            font-size: 16px; 
            font-weight: bold; 
            background-color: #f0f0f0;
            padding: 10px;
            border-left: 4px solid #2563eb;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 10px 0;
            font-size: 12px;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left;
        }
        th { 
            background-color: #f5f5f5; 
            font-weight: bold;
        }
        .amount { 
            text-align: right; 
        }
        .category-total { 
            font-weight: bold; 
            background-color: #f9f9f9;
        }
        .grand-total { 
            font-size: 16px; 
            font-weight: bold; 
            text-align: right;
            margin-top: 20px;
            border-top: 2px solid #333;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">BuildPro Construction</div>
        <div class="project-title">Bid Export - ${projectName}</div>
        <div>Generated: ${new Date().toLocaleDateString()}</div>
    </div>

    ${Object.entries(categorizedItems).map(([category, items]) => {
      const categoryTotal = items.reduce((sum, item) => sum + item.total, 0);
      return `
      <div class="category-section">
        <div class="category-title">${category} - $${categoryTotal.toLocaleString()}</div>
        <table>
          <thead>
            <tr>
              <th>Subcategory</th>
              <th>Description</th>
              <th>Unit</th>
              <th>Unit Cost</th>
              <th>Quantity</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
            <tr>
              <td>${item.subcategory || '-'}</td>
              <td>${item.description}</td>
              <td>${item.unit}</td>
              <td class="amount">$${item.unitCost.toLocaleString()}</td>
              <td class="amount">${item.quantity}</td>
              <td class="amount">$${item.total.toLocaleString()}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      `;
    }).join('')}

    <div class="grand-total">
      Total Bid Amount: $${totalAmount.toLocaleString()}
    </div>
</body>
</html>
  `;

  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(content);
    newWindow.document.close();
    newWindow.print();
  }
};
