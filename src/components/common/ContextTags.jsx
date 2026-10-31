import React from 'react';

export const ContextTags = ({ ctx, className = "mt-3", hideType = false }) => {
  if (!ctx) return null;
  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border tag-os">{ctx.os}</span>
      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border tag-shell">{ctx.shell}</span>
      {!hideType && ctx.type && (
        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border tag-type">{ctx.type}</span>
      )}
    </div>
  );
};

export default ContextTags;