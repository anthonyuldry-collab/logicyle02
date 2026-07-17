import { SepaPaymentOrder, TeamSepaSettings } from '../types';
import { normalizeIban } from './sepaUtils';
import { SepaCollectionOrder } from './sepaCollectionUtils';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsv(value: string | number | undefined): string {
  const str = value === undefined || value === null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildCreditorAgentXml(beneficiaryBic?: string): string {
  const bic = beneficiaryBic?.trim().toUpperCase();
  if (bic) {
    return `<CdtrAgt><FinInstnId><BIC>${escapeXml(bic)}</BIC></FinInstnId></CdtrAgt>`;
  }
  return '';
}

/** Génère le XML pain.001 (utilisable en tests). */
export function generateSepaPain001XmlContent(
  teamName: string,
  settings: TeamSepaSettings,
  orders: SepaPaymentOrder[],
  executionDate?: string
): string | null {
  const readyOrders = orders.filter((o) => o.hasValidIban && o.amount > 0);
  if (readyOrders.length === 0) return null;

  const now = new Date();
  const msgId = `LC-${now.toISOString().slice(0, 19).replace(/[-:T]/g, '')}`;
  const execDate = executionDate || now.toISOString().slice(0, 10);
  const ctrlSum = readyOrders.reduce((sum, o) => sum + o.amount, 0).toFixed(2);
  const debtorIban = normalizeIban(settings.debtorIban);
  const debtorBic = settings.debtorBic?.trim().toUpperCase() || '';

  const transactions = readyOrders
    .map(
      (order) => `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${escapeXml(order.id.slice(0, 35))}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="EUR">${order.amount.toFixed(2)}</InstdAmt>
        </Amt>
        ${buildCreditorAgentXml(order.beneficiaryBic)}
        <Cdtr>
          <Nm>${escapeXml(order.beneficiaryName.slice(0, 70))}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id><IBAN>${escapeXml(order.beneficiaryIban)}</IBAN></Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${escapeXml(order.reference.slice(0, 140))}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${now.toISOString()}</CreDtTm>
      <NbOfTxs>${readyOrders.length}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(settings.debtorName.slice(0, 70))}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(msgId)}-1</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${readyOrders.length}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${execDate}</ReqdExctnDt>
      <Dbtr><Nm>${escapeXml(settings.debtorName.slice(0, 70))}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${escapeXml(debtorIban)}</IBAN></Id></DbtrAcct>
      <DbtrAgt>
        <FinInstnId>${debtorBic ? `<BIC>${escapeXml(debtorBic)}</BIC>` : '<Othr><Id>NOTPROVIDED</Id></Othr>'}</FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>${transactions}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}

export function exportSepaPain001Xml(
  teamName: string,
  settings: TeamSepaSettings,
  orders: SepaPaymentOrder[],
  executionDate?: string
): void {
  const xml = generateSepaPain001XmlContent(teamName, settings, orders, executionDate);
  if (!xml) return;

  const execDate = executionDate || new Date().toISOString().slice(0, 10);
  const safeTeamName = teamName.replace(/\s+/g, '_');
  downloadFile(
    `LogiCycle_SEPA_${safeTeamName}_${execDate}.xml`,
    xml,
    'application/xml;charset=utf-8'
  );
}

export function exportSepaCsv(teamName: string, orders: SepaPaymentOrder[]): void {
  const readyOrders = orders.filter((o) => o.hasValidIban && o.amount > 0);
  if (readyOrders.length === 0) return;

  const lines = [
    'Type,Bénéficiaire,IBAN,BIC,Montant (EUR),Référence,Source',
    ...readyOrders.map((o) =>
      [
        o.type === 'salary' ? 'Salaire' : 'Remboursement',
        o.beneficiaryName,
        o.beneficiaryIban,
        o.beneficiaryBic || '',
        o.amount.toFixed(2),
        o.reference,
        o.sourceLabel || o.sourceId,
      ]
        .map(escapeCsv)
        .join(',')
    ),
  ];

  const safeTeamName = teamName.replace(/\s+/g, '_');
  const date = new Date().toISOString().slice(0, 10);
  downloadFile(
    `LogiCycle_SEPA_${safeTeamName}_${date}.csv`,
    '\uFEFF' + lines.join('\n'),
    'text/csv;charset=utf-8'
  );
}

export function exportSepaPain008Xml(
  teamName: string,
  settings: TeamSepaSettings,
  orders: SepaCollectionOrder[],
  executionDate?: string
): void {
  const readyOrders = orders.filter((o) => o.hasValidIban && o.amount > 0);
  if (readyOrders.length === 0) return;

  const now = new Date();
  const msgId = `LC-COL-${now.toISOString().slice(0, 19).replace(/[-:T]/g, '')}`;
  const execDate = executionDate || now.toISOString().slice(0, 10);
  const ctrlSum = readyOrders.reduce((sum, o) => sum + o.amount, 0).toFixed(2);
  const creditorIban = normalizeIban(settings.debtorIban);
  const creditorBic = settings.debtorBic?.trim().toUpperCase() || '';
  const ics = settings.creditorIdentifier || '';

  const transactions = readyOrders
    .map((order) => `
      <DrctDbtTxInf>
        <PmtId><EndToEndId>${escapeXml(order.id.slice(0, 35))}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${order.amount.toFixed(2)}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${escapeXml(order.mandateReference || order.incomeItemId)}</MndtId>
            <DtOfSgntr>${execDate}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          <FinInstnId>${creditorBic ? `<BIC>${escapeXml(creditorBic)}</BIC>` : '<Othr><Id>NOTPROVIDED</Id></Othr>'}</FinInstnId>
        </DbtrAgt>
        <Dbtr><Nm>${escapeXml(order.clientName.slice(0, 70))}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${escapeXml(order.beneficiaryIban)}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>${escapeXml(order.reference.slice(0, 140))}</Ustrd></RmtInf>
      </DrctDbtTxInf>`)
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${escapeXml(msgId)}</MsgId>
      <CreDtTm>${now.toISOString()}</CreDtTm>
      <NbOfTxs>${readyOrders.length}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <InitgPty><Nm>${escapeXml(settings.debtorName.slice(0, 70))}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(msgId)}-1</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${readyOrders.length}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl><LclInstrm><Cd>CORE</Cd></LclInstrm><SeqTp>OOFF</SeqTp></PmtTpInf>
      <ReqdColltnDt>${execDate}</ReqdColltnDt>
      <Cdtr><Nm>${escapeXml(settings.debtorName.slice(0, 70))}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${escapeXml(creditorIban)}</IBAN></Id></CdtrAcct>
      <CdtrAgt><FinInstnId>${creditorBic ? `<BIC>${escapeXml(creditorBic)}</BIC>` : '<Othr><Id>NOTPROVIDED</Id></Othr>'}</FinInstnId></CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      ${ics ? `<CdtrSchmeId><Id><PrvtId><Othr><Id>${escapeXml(ics)}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id></CdtrSchmeId>` : ''}
      ${transactions}
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`;

  const safeTeamName = teamName.replace(/\s+/g, '_');
  downloadFile(`LogiCycle_SEPA_COL_${safeTeamName}_${execDate}.xml`, xml, 'application/xml;charset=utf-8');
}
