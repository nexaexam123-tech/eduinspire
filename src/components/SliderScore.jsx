import React from 'react';

export function getCriteriaList() {
  return [
    { key: 'studentImpact', title: '1. Student Impact', max: 20, description: 'Enhancement of student learning, skill acquisition, career readiness & direct student benefits.' },
    { key: 'facultyImpact', title: '2. Faculty Impact', max: 10, description: 'Faculty skill advancement, research productivity, teaching methodology improvement.' },
    { key: 'adminImpact', title: '3. Institutional Impact', max: 10, description: 'Operational efficiency, policy governance, infrastructure & institutional reputation.' },
    { key: 'socialImpact', title: '4. Social Impact', max: 10, description: 'Broader societal benefits, environmental sustainability, industry alignment & community outreach.' },
    { key: 'innovation', title: '5. Innovation', max: 20, description: 'Uniqueness of idea, novelty of approach, intellectual depth & creative problem solving.' },
    { key: 'implementation', title: '6. Implementation', max: 15, description: 'Execution methodology, timeline discipline, resource utilization & risk management.' },
    { key: 'outcomes', title: '7. Evidence of Outcomes', max: 10, description: 'Quantifiable metrics, data evidence, survey feedback & tangible project deliverables.' },
    { key: 'replicability', title: '8. Replicability', max: 5, description: 'Scalability potential, adaptability across other colleges/departments & lessons learned.' }
  ];
}

export default function SliderScore({ categoryKey, title, max, description, value, onChange, disabled }) {
  const currentVal = parseInt(value) || 0;
  return (
    <div className="bg-white p-5 rounded-2xl border border-[#C9C9C9] space-y-4 transition-all duration-300 hover:border-indigo-400 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-[#111315] text-sm md:text-base tracking-tight">{title}</h3>
          <p className="text-[11px] text-[#55585C] mt-1 leading-relaxed">{description}</p>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <div className="px-3 py-1.5 bg-[#F1F0EE] border border-[#C9C9C9] rounded-lg text-indigo-700 font-mono font-bold text-lg shadow-sm">
            {currentVal} <span className="text-[#55585C] font-normal text-xs">/ {max}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <input
          type="range"
          min="0"
          max={max}
          step="1"
          value={currentVal}
          onChange={(e) => onChange(categoryKey, parseInt(e.target.value))}
          disabled={disabled}
          className="w-full h-3 bg-[#E5E4E2] rounded-lg appearance-none cursor-pointer disabled:opacity-50 accent-indigo-600"
        />
        
        <div className="flex justify-between text-[10px] text-[#55585C] font-mono font-bold uppercase tracking-wider">
          <span>0 (Min)</span>
          <span>{Math.round(max / 2)} (Mid)</span>
          <span>{max} (Max)</span>
        </div>
      </div>
    </div>
  );
}
