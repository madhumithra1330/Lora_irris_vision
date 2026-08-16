import { useGateway } from '../context/GatewayContext';
import { useTranslation } from 'react-i18next';

export default function GatewaySelector() {
  const { t } = useTranslation();
  const { gateways, selectedGateway, selectGateway, hasMultiple } = useGateway();

  if (!hasMultiple) return null;

  return (
    <select
      value={selectedGateway?.gateway_id || ''}
      onChange={(e) => {
        const gw = gateways.find((g) => g.gateway_id === e.target.value);
        if (gw) selectGateway(gw);
      }}
      className="bg-surface-700 text-white text-sm rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-liv-500 min-h-[40px]"
      aria-label={t('gateway.selectGateway')}
    >
      {gateways.map((gw) => (
        <option key={gw.gateway_id} value={gw.gateway_id}>
          {gw.gateway_name || gw.gateway_id}
        </option>
      ))}
    </select>
  );
}
