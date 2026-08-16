import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Users, Radio, Leaf } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function SystemTopology({ farmers, gateways, nodes }) {
  const [expandedFarmers, setExpandedFarmers] = useState({});

  const toggleFarmer = (id) => {
    setExpandedFarmers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="rounded-2xl border border-field-border bg-field-card p-6 shadow-card space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-field-text-secondary">Network Topology</h3>
        <p className="text-xs text-field-text-secondary/70 mt-1">Hierarchical visualization of network structure</p>
      </div>

      <div className="space-y-3 mt-4">
        {farmers && farmers.map(farmer => {
          const farmerGws = gateways ? gateways.filter(g => g.farmer_id === farmer.id) : [];
          const isExpanded = !!expandedFarmers[farmer.id];

          return (
            <div key={farmer.id} className="rounded-xl border border-field-border bg-white overflow-hidden shadow-card">
              {/* Farmer Header Row */}
              <div 
                onClick={() => toggleFarmer(farmer.id)}
                className="flex items-center justify-between px-4 py-3.5 cursor-pointer bg-field-bg hover:bg-field-hover transition"
              >
                <div className="flex items-center gap-3">
                  <div className="text-field-primary bg-field-soft-primary p-2 rounded-lg">
                    <Users size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-field-text-primary text-sm">{farmer.name}</h4>
                    <p className="text-xs text-field-text-secondary">{farmer.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-field-text-secondary bg-white px-2.5 py-1 rounded-full border border-field-border shadow-sm">
                    {farmerGws.length} Gateway{farmerGws.length !== 1 ? 's' : ''}
                  </span>
                  {isExpanded ? <ChevronDown size={16} className="text-field-text-secondary" /> : <ChevronRight size={16} className="text-field-text-secondary" />}
                </div>
              </div>

              {/* Collapsible Area */}
              {isExpanded && (
                <div className="border-t border-field-border bg-field-bg/30 px-4 py-3 space-y-3">
                  {farmerGws.length === 0 ? (
                    <p className="text-xs text-field-text-secondary italic pl-11 py-2">No gateways assigned to this farmer.</p>
                  ) : (
                    farmerGws.map(gw => {
                      const gwNodes = nodes ? nodes.filter(n => n.gateway_id === gw.id) : [];

                      return (
                        <div key={gw.id} className="pl-6 border-l-2 border-field-border space-y-2">
                          {/* Gateway Row */}
                          <div className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <Radio size={14} className="text-sky-600" />
                              <span className="text-xs font-bold text-field-text-primary font-display">{gw.id}</span>
                              <span className="text-xs text-field-text-secondary font-medium">({gw.name})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-field-text-secondary">⚡ {gw.battery}%</span>
                              <StatusBadge status={gw.status} />
                            </div>
                          </div>

                          {/* Nodes List */}
                          <div className="pl-6 space-y-2">
                            {gwNodes.length === 0 ? (
                              <p className="text-xs text-field-text-secondary italic py-1">No field nodes connected.</p>
                            ) : (
                              gwNodes.map(node => (
                                <div key={node.id} className="flex items-center justify-between py-1 border-b border-field-border/50 pl-4 border-l border-field-border">
                                  <div className="flex items-center gap-2">
                                    <Leaf size={12} className="text-field-primary" />
                                    <span className="text-xs font-bold text-field-text-primary font-display">{node.id}</span>
                                    <span className="text-xs text-field-text-secondary">({node.crop_name})</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-field-text-secondary">💧 {node.soil_moisture}%</span>
                                    <span className="text-xs font-medium text-field-text-secondary">🌡️ {node.temperature}°C</span>
                                    <StatusBadge status={node.status} />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
