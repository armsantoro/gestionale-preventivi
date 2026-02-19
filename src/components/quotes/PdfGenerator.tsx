import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import { Quote, QuoteItem, WeddingDetails, PaymentPlan, CompanySettings, FLOWERS, GREENERY, WEDDING_STYLES } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PdfProps {
  quote: Quote;
  items: QuoteItem[];
  weddingDetails?: WeddingDetails;
  paymentPlans: PaymentPlan[];
  settings: CompanySettings;
  accentColor?: string;
  template?: 'elegante' | 'minimal';
  customFlowers?: { id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group items by section preserving sort order. */
function groupBySection(items: QuoteItem[]): Record<string, QuoteItem[]> {
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const groups: Record<string, QuoteItem[]> = {};
  for (const item of sorted) {
    const key = item.section || 'Altro';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

/** Compute section subtotal (excluding gifts). */
function sectionSubtotal(sectionItems: QuoteItem[]): number {
  return sectionItems.reduce((sum, i) => sum + (i.isGift ? 0 : i.amount), 0);
}

/** Parse palette colors from JSON array string or comma-separated hex codes. */
function parsePaletteColors(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch { /* fallback to comma-separated */ }
  return raw.split(',').map((c) => c.trim()).filter(Boolean);
}

/** Parse JSON array string or comma-separated IDs, resolve to names using a lookup. */
function parseJsonOrCsv(raw: string, lookup?: { id: string; name: string }[]): string[] {
  if (!raw) return [];
  let ids: string[];
  try {
    const parsed = JSON.parse(raw);
    ids = Array.isArray(parsed) ? parsed : raw.split(',').map(s => s.trim());
  } catch {
    ids = raw.split(',').map(s => s.trim());
  }
  if (!lookup) return ids.filter(Boolean);
  return ids.map(id => lookup.find(item => item.id === id)?.name || id).filter(Boolean);
}

/** Lighten a hex color by a given amount (0-1). */
function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ---------------------------------------------------------------------------
// Dynamic style factory
// ---------------------------------------------------------------------------

function createStyles(accent: string, tpl: 'elegante' | 'minimal') {
  const isElegante = tpl === 'elegante';
  const accentLight = lighten(accent, 0.55);
  const borderColor = isElegante ? accent : '#444444';
  const headerBg = isElegante ? accent : '#FFFFFF';
  const headerFg = isElegante ? '#FFFFFF' : '#000000';
  const sectionBg = isElegante ? accentLight : '#F2F2F2';
  const rowAlt = isElegante ? '#FAF7F5' : '#FAFAFA';

  return StyleSheet.create({
    // ---- Page ----
    page: {
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#333333',
      paddingTop: 40,
      paddingBottom: 60,
      paddingHorizontal: 40,
    },

    // ---- Header ----
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    companyName: {
      fontSize: 20,
      fontFamily: 'Helvetica-Bold',
      color: accent,
      marginBottom: 2,
    },
    companyDetail: {
      fontSize: 8,
      color: '#666666',
      lineHeight: 1.5,
    },
    quoteMetaBlock: {
      alignItems: 'flex-end',
    },
    quoteTitle: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: accent,
      marginBottom: 6,
      textAlign: 'right',
    },
    quoteMeta: {
      fontSize: 8,
      color: '#555555',
      textAlign: 'right',
      lineHeight: 1.6,
    },
    headerDivider: {
      height: isElegante ? 3 : 1,
      backgroundColor: accent,
      marginTop: 10,
      marginBottom: 14,
      borderRadius: isElegante ? 2 : 0,
    },

    // ---- Client / Event ----
    clientEventRow: {
      flexDirection: 'row',
      marginBottom: 14,
    },
    infoBox: {
      flex: 1,
      padding: 8,
      borderRadius: isElegante ? 4 : 0,
      borderWidth: isElegante ? 0 : 0.5,
      borderColor: borderColor,
      backgroundColor: isElegante ? accentLight : '#FFFFFF',
    },
    infoBoxRight: {
      flex: 1,
      padding: 8,
      marginLeft: 10,
      borderRadius: isElegante ? 4 : 0,
      borderWidth: isElegante ? 0 : 0.5,
      borderColor: borderColor,
      backgroundColor: isElegante ? accentLight : '#FFFFFF',
    },
    infoLabel: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      color: accent,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 9,
      color: '#333333',
      marginBottom: 4,
    },

    // ---- Wedding specifics ----
    weddingSection: {
      marginBottom: 14,
      padding: 8,
      borderRadius: isElegante ? 4 : 0,
      borderWidth: isElegante ? 0 : 0.5,
      borderColor: borderColor,
      backgroundColor: isElegante ? accentLight : '#FFFFFF',
    },
    weddingSectionTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: accent,
      marginBottom: 6,
    },
    paletteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    colorSwatch: {
      width: 16,
      height: 16,
      marginRight: 4,
      borderRadius: isElegante ? 3 : 0,
      borderWidth: 0.5,
      borderColor: '#CCCCCC',
    },
    weddingDetailRow: {
      flexDirection: 'row',
      marginBottom: 3,
    },

    // ---- Items table ----
    tableContainer: {
      marginBottom: 14,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: headerBg,
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderTopLeftRadius: isElegante ? 4 : 0,
      borderTopRightRadius: isElegante ? 4 : 0,
    },
    tableHeaderText: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 8,
      color: headerFg,
      textTransform: 'uppercase',
    },
    sectionHeader: {
      flexDirection: 'row',
      backgroundColor: sectionBg,
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: borderColor,
    },
    sectionHeaderText: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 9,
      color: isElegante ? accent : '#333333',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: '#E0E0E0',
    },
    tableRowAlt: {
      backgroundColor: rowAlt,
    },
    colQty: { width: '8%' },
    colDesc: { width: '52%' },
    colPrice: { width: '20%', textAlign: 'right' },
    colAmount: { width: '20%', textAlign: 'right' },
    cellText: { fontSize: 8.5, color: '#333333' },
    cellTextBold: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#333333' },
    cellTextItalic: { fontSize: 8.5, fontFamily: 'Helvetica-Oblique', color: '#888888' },
    giftNote: {
      fontSize: 7,
      fontFamily: 'Helvetica-Oblique',
      color: accent,
    },
    sectionSubtotalRow: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderTopWidth: 1,
      borderTopColor: borderColor,
      backgroundColor: isElegante ? accentLight : '#F5F5F5',
    },

    // ---- Financial summary ----
    summaryContainer: {
      alignSelf: 'flex-end',
      width: '45%',
      marginBottom: 18,
      borderWidth: isElegante ? 0 : 0.5,
      borderColor: borderColor,
      borderRadius: isElegante ? 4 : 0,
      overflow: 'hidden',
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: '#E0E0E0',
    },
    summaryLabel: { fontSize: 9, color: '#555555' },
    summaryValue: { fontSize: 9, color: '#333333' },
    summaryTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      paddingHorizontal: 8,
      backgroundColor: isElegante ? accent : '#333333',
    },
    summaryTotalLabel: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: '#FFFFFF',
    },
    summaryTotalValue: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: '#FFFFFF',
    },

    // ---- Payment plan ----
    paymentTitle: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: accent,
      marginBottom: 6,
    },
    paymentTable: {
      marginBottom: 18,
      borderWidth: 0.5,
      borderColor: borderColor,
      borderRadius: isElegante ? 4 : 0,
      overflow: 'hidden',
    },
    paymentHeader: {
      flexDirection: 'row',
      backgroundColor: headerBg,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    paymentHeaderText: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 8,
      color: headerFg,
      textTransform: 'uppercase',
    },
    paymentRow: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: '#E0E0E0',
    },
    payColDesc: { width: '40%' },
    payColPct: { width: '15%', textAlign: 'center' },
    payColAmt: { width: '25%', textAlign: 'right' },
    payColDate: { width: '20%', textAlign: 'right' },

    // ---- Notes / Conditions ----
    notesContainer: {
      marginBottom: 18,
    },
    notesTitle: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: accent,
      marginBottom: 4,
    },
    notesText: {
      fontSize: 8,
      color: '#555555',
      lineHeight: 1.6,
    },
    conditionsBox: {
      padding: 8,
      backgroundColor: isElegante ? accentLight : '#F9F9F9',
      borderRadius: isElegante ? 4 : 0,
      borderWidth: isElegante ? 0 : 0.5,
      borderColor: '#DDDDDD',
      marginBottom: 18,
    },

    // ---- Signature ----
    signatureContainer: {
      marginTop: 10,
      marginBottom: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    signatureBlock: {
      width: '40%',
    },
    signatureLabel: {
      fontSize: 8,
      color: '#666666',
      marginBottom: 24,
    },
    signatureLine: {
      borderBottomWidth: 1,
      borderBottomColor: '#333333',
      marginBottom: 4,
    },
    acceptanceText: {
      fontSize: 8,
      fontFamily: 'Helvetica-Oblique',
      color: '#888888',
      textAlign: 'center',
      marginBottom: 14,
    },

    // ---- Footer ----
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 40,
      right: 40,
      borderTopWidth: 1,
      borderTopColor: isElegante ? accent : '#CCCCCC',
      paddingTop: 6,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    footerText: {
      fontSize: 7,
      color: '#999999',
    },
    pageNumber: {
      fontSize: 7,
      color: '#999999',
    },
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Header with company info and quote metadata. */
function Header({
  quote,
  settings,
  styles,
  accent,
}: {
  quote: Quote;
  settings: CompanySettings;
  styles: ReturnType<typeof createStyles>;
  accent: string;
}) {
  const isWedding = quote.eventType === 'matrimonio';
  const title = isWedding ? 'PROPOSTA WEDDING DECOR' : 'PREVENTIVO EVENTI';

  return (
    <>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.companyName}>{settings.companyName}</Text>
          <Text style={styles.companyDetail}>{settings.address}</Text>
          <Text style={styles.companyDetail}>Tel: {settings.phone}</Text>
          <Text style={styles.companyDetail}>Email: {settings.email}</Text>
          <Text style={styles.companyDetail}>P.IVA: {settings.vatNumber}</Text>
        </View>
        <View style={styles.quoteMetaBlock}>
          <Text style={styles.quoteTitle}>{title}</Text>
          <Text style={styles.quoteMeta}>N. {quote.number}</Text>
          <Text style={styles.quoteMeta}>Data: {formatDate(quote.createdAt)}</Text>
          <Text style={styles.quoteMeta}>Validit\u00e0: {formatDate(quote.expiryDate)}</Text>
        </View>
      </View>
      <View style={styles.headerDivider} />
    </>
  );
}

/** Client info and event details. */
function ClientEventSection({
  quote,
  styles,
}: {
  quote: Quote;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.clientEventRow}>
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Cliente</Text>
        <Text style={styles.infoValue}>{quote.clientName || '—'}</Text>
        <Text style={styles.infoLabel}>Data Evento</Text>
        <Text style={styles.infoValue}>{formatDate(quote.eventDate)}</Text>
      </View>
      <View style={styles.infoBoxRight}>
        <Text style={styles.infoLabel}>Location</Text>
        <Text style={styles.infoValue}>{quote.eventLocation || '—'}</Text>
        <Text style={styles.infoLabel}>Numero Ospiti</Text>
        <Text style={styles.infoValue}>{quote.guestCount || '—'}</Text>
        {quote.tableCount > 0 && (
          <>
            <Text style={styles.infoLabel}>Tavoli</Text>
            <Text style={styles.infoValue}>{quote.tableCount}</Text>
          </>
        )}
      </View>
    </View>
  );
}

/** Wedding-specific palette, flowers, style block. */
function WeddingDetailsSection({
  weddingDetails,
  styles,
  customFlowers,
}: {
  weddingDetails: WeddingDetails;
  styles: ReturnType<typeof createStyles>;
  customFlowers?: { id: string; name: string }[];
}) {
  const colors = parsePaletteColors(weddingDetails.paletteColors);
  const allFlowerLookup = [...FLOWERS, ...(customFlowers || [])];
  const flowers = parseJsonOrCsv(weddingDetails.flowers, allFlowerLookup);
  const greenery = parseJsonOrCsv(weddingDetails.greenery, GREENERY as { id: string; name: string }[]);
  const styleName = WEDDING_STYLES.find(s => s.id === weddingDetails.style)?.name || weddingDetails.style;

  return (
    <View style={styles.weddingSection}>
      <Text style={styles.weddingSectionTitle}>Dettagli Matrimonio</Text>

      {(weddingDetails.brideName || weddingDetails.groomName) && (
        <View style={styles.weddingDetailRow}>
          <Text style={styles.infoLabel}>Sposi: </Text>
          <Text style={styles.infoValue}>
            {[weddingDetails.brideName, weddingDetails.groomName].filter(Boolean).join(' & ')}
          </Text>
        </View>
      )}

      {weddingDetails.ceremonyType && (
        <View style={styles.weddingDetailRow}>
          <Text style={styles.infoLabel}>Cerimonia: </Text>
          <Text style={styles.infoValue}>
            {weddingDetails.ceremonyType.charAt(0).toUpperCase() + weddingDetails.ceremonyType.slice(1)}
          </Text>
        </View>
      )}

      {weddingDetails.churchName && (
        <View style={styles.weddingDetailRow}>
          <Text style={styles.infoLabel}>Chiesa / Cerimonia: </Text>
          <Text style={styles.infoValue}>{weddingDetails.churchName}</Text>
        </View>
      )}

      {weddingDetails.receptionName && (
        <View style={styles.weddingDetailRow}>
          <Text style={styles.infoLabel}>Ricevimento: </Text>
          <Text style={styles.infoValue}>{weddingDetails.receptionName}</Text>
        </View>
      )}

      {weddingDetails.style && (
        <View style={styles.weddingDetailRow}>
          <Text style={styles.infoLabel}>Stile: </Text>
          <Text style={styles.infoValue}>{styleName}</Text>
        </View>
      )}

      {colors.length > 0 && (
        <View style={styles.paletteRow}>
          {colors.map((c, i) => (
            <View key={i} style={[styles.colorSwatch, { backgroundColor: c }]} />
          ))}
        </View>
      )}

      {flowers.length > 0 && (
        <View style={styles.weddingDetailRow}>
          <Text style={styles.infoLabel}>Fiori: </Text>
          <Text style={styles.infoValue}>{flowers.join(', ')}</Text>
        </View>
      )}

      {greenery.length > 0 && (
        <View style={styles.weddingDetailRow}>
          <Text style={styles.infoLabel}>Verde: </Text>
          <Text style={styles.infoValue}>{greenery.join(', ')}</Text>
        </View>
      )}
    </View>
  );
}

/** Items table grouped by section. */
function ItemsTable({
  items,
  styles,
}: {
  items: QuoteItem[];
  styles: ReturnType<typeof createStyles>;
}) {
  const groups = groupBySection(items);
  const sectionNames = Object.keys(groups);

  return (
    <View style={styles.tableContainer}>
      {/* Column headers */}
      <View style={styles.tableHeader}>
        <View style={styles.colQty}>
          <Text style={styles.tableHeaderText}>Qt\u00e0</Text>
        </View>
        <View style={styles.colDesc}>
          <Text style={styles.tableHeaderText}>Descrizione</Text>
        </View>
        <View style={styles.colPrice}>
          <Text style={styles.tableHeaderText}>Prezzo Unit.</Text>
        </View>
        <View style={styles.colAmount}>
          <Text style={styles.tableHeaderText}>Importo</Text>
        </View>
      </View>

      {sectionNames.map((section) => {
        const sectionItems = groups[section];
        const subtotal = sectionSubtotal(sectionItems);
        return (
          <View key={section} wrap={false}>
            {/* Section heading */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section}</Text>
            </View>

            {/* Rows */}
            {sectionItems.map((item, idx) => (
              <View
                key={item.id}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <View style={styles.colQty}>
                  <Text style={item.isGift ? styles.cellTextItalic : styles.cellText}>
                    {item.quantity}
                  </Text>
                </View>
                <View style={styles.colDesc}>
                  <Text style={item.isGift ? styles.cellTextItalic : styles.cellText}>
                    {item.description}
                  </Text>
                  {item.isGift && <Text style={styles.giftNote}>OMAGGIO</Text>}
                </View>
                <View style={styles.colPrice}>
                  <Text style={item.isGift ? styles.cellTextItalic : styles.cellText}>
                    {formatCurrency(item.unitPrice)}
                  </Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={item.isGift ? styles.cellTextItalic : styles.cellTextBold}>
                    {item.isGift ? '—' : formatCurrency(item.amount)}
                  </Text>
                </View>
              </View>
            ))}

            {/* Section subtotal */}
            <View style={styles.sectionSubtotalRow}>
              <View style={styles.colQty} />
              <View style={styles.colDesc}>
                <Text style={styles.cellTextBold}>Subtotale {section}</Text>
              </View>
              <View style={styles.colPrice} />
              <View style={styles.colAmount}>
                <Text style={styles.cellTextBold}>{formatCurrency(subtotal)}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Financial summary block. */
function FinancialSummary({
  quote,
  settings,
  styles,
}: {
  quote: Quote;
  settings: CompanySettings;
  styles: ReturnType<typeof createStyles>;
}) {
  const hasDiscount =
    quote.discountValue != null && quote.discountValue > 0 && quote.discountType != null;
  const isForfettario = settings.taxRegime === 'forfettario';

  let discountLabel = '';
  if (hasDiscount) {
    discountLabel =
      quote.discountType === 'percentage'
        ? `Sconto (${quote.discountValue}%)`
        : 'Sconto';
  }

  let discountAmount = 0;
  if (hasDiscount) {
    discountAmount =
      quote.discountType === 'percentage'
        ? quote.subtotal * (quote.discountValue / 100)
        : quote.discountValue;
  }

  return (
    <View style={styles.summaryContainer}>
      {/* Subtotale */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotale</Text>
        <Text style={styles.summaryValue}>{formatCurrency(quote.subtotal)}</Text>
      </View>

      {/* Discount */}
      {hasDiscount && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{discountLabel}</Text>
          <Text style={styles.summaryValue}>- {formatCurrency(discountAmount)}</Text>
        </View>
      )}

      {/* IVA note */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>IVA</Text>
        <Text style={styles.summaryValue}>
          {isForfettario
            ? 'Non dovuta ex art.1 c.54-89 L.190/2014'
            : `${settings.vatRate}%`}
        </Text>
      </View>

      {/* Totale */}
      <View style={styles.summaryTotalRow}>
        <Text style={styles.summaryTotalLabel}>TOTALE FINALE</Text>
        <Text style={styles.summaryTotalValue}>{formatCurrency(quote.total)}</Text>
      </View>
    </View>
  );
}

/** Payment plan table. */
function PaymentPlanSection({
  paymentPlans,
  styles,
}: {
  paymentPlans: PaymentPlan[];
  styles: ReturnType<typeof createStyles>;
}) {
  if (!paymentPlans || paymentPlans.length === 0) return null;

  const sorted = [...paymentPlans].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <View wrap={false}>
      <Text style={styles.paymentTitle}>Piano di Pagamento</Text>
      <View style={styles.paymentTable}>
        <View style={styles.paymentHeader}>
          <View style={styles.payColDesc}>
            <Text style={styles.paymentHeaderText}>Descrizione</Text>
          </View>
          <View style={styles.payColPct}>
            <Text style={styles.paymentHeaderText}>%</Text>
          </View>
          <View style={styles.payColAmt}>
            <Text style={styles.paymentHeaderText}>Importo</Text>
          </View>
          <View style={styles.payColDate}>
            <Text style={styles.paymentHeaderText}>Scadenza</Text>
          </View>
        </View>
        {sorted.map((p, idx) => (
          <View
            key={p.id}
            style={[styles.paymentRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
          >
            <View style={styles.payColDesc}>
              <Text style={styles.cellText}>{p.description}</Text>
            </View>
            <View style={styles.payColPct}>
              <Text style={styles.cellText}>{p.percentage}%</Text>
            </View>
            <View style={styles.payColAmt}>
              <Text style={styles.cellTextBold}>{formatCurrency(p.amount)}</Text>
            </View>
            <View style={styles.payColDate}>
              <Text style={styles.cellText}>{formatDate(p.dueDate)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Notes and conditions. */
function NotesConditions({
  quote,
  styles,
}: {
  quote: Quote;
  styles: ReturnType<typeof createStyles>;
}) {
  const hasNotes = quote.clientNotes && quote.clientNotes.trim().length > 0;
  const hasConditions = quote.conditions && quote.conditions.trim().length > 0;

  if (!hasNotes && !hasConditions) return null;

  return (
    <View style={styles.notesContainer}>
      {hasNotes && (
        <>
          <Text style={styles.notesTitle}>Note</Text>
          <Text style={styles.notesText}>{quote.clientNotes}</Text>
        </>
      )}
      {hasConditions && (
        <View style={styles.conditionsBox}>
          <Text style={styles.notesTitle}>Condizioni</Text>
          <Text style={styles.notesText}>{quote.conditions}</Text>
        </View>
      )}
    </View>
  );
}

/** Signature block. */
function SignatureBlock({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return (
    <View wrap={false}>
      <Text style={styles.acceptanceText}>Per accettazione dell&apos;offerta</Text>
      <View style={styles.signatureContainer}>
        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>Il Cliente</Text>
          <View style={styles.signatureLine} />
        </View>
        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>Data</Text>
          <View style={styles.signatureLine} />
        </View>
      </View>
    </View>
  );
}

/** Fixed page footer with company contacts and page number. */
function PageFooter({
  settings,
  styles,
}: {
  settings: CompanySettings;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {settings.companyName} | {settings.phone} | {settings.email}
      </Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Document component
// ---------------------------------------------------------------------------

export function QuotePdfDocument({
  quote,
  items,
  weddingDetails,
  paymentPlans,
  settings,
  accentColor = '#8B6F5E',
  template = 'elegante',
  customFlowers,
}: PdfProps) {
  const styles = createStyles(accentColor, template);
  const isWedding = quote.eventType === 'matrimonio';

  return (
    <Document
      title={`${quote.number} - ${settings.companyName}`}
      author={settings.companyName}
      creator={settings.companyName}
    >
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <Header quote={quote} settings={settings} styles={styles} accent={accentColor} />

        {/* CLIENT & EVENT */}
        <ClientEventSection quote={quote} styles={styles} />

        {/* WEDDING DETAILS */}
        {isWedding && weddingDetails && (
          <WeddingDetailsSection weddingDetails={weddingDetails} styles={styles} customFlowers={customFlowers} />
        )}

        {/* ITEMS TABLE */}
        {items.length > 0 && <ItemsTable items={items} styles={styles} />}

        {/* FINANCIAL SUMMARY */}
        <FinancialSummary quote={quote} settings={settings} styles={styles} />

        {/* PAYMENT PLAN */}
        <PaymentPlanSection paymentPlans={paymentPlans} styles={styles} />

        {/* NOTES & CONDITIONS */}
        <NotesConditions quote={quote} styles={styles} />

        {/* SIGNATURE */}
        <SignatureBlock styles={styles} />

        {/* FOOTER (fixed on every page) */}
        <PageFooter settings={settings} styles={styles} />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// PDF generation / download helper
// ---------------------------------------------------------------------------

export async function generatePdf(props: PdfProps): Promise<void> {
  const blob = await pdf(<QuotePdfDocument {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${props.quote.number}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
