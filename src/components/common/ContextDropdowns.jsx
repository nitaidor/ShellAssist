import React from 'react';
import CustomSelect from './CustomSelect';
import { OS_OPTIONS, SHELL_OPTIONS, TYPE_OPTIONS } from '../../constants/environment';

export const ContextDropdowns = ({ ctx, setCtx }) => {
  const handleOsChange = (newOs) => {
    if (newOs === '──────────') return; 
    const validShells = SHELL_OPTIONS[newOs] || [];
    const newShell = validShells.includes(ctx.shell) ? ctx.shell : validShells[0];
    setCtx({ ...ctx, os: newOs, shell: newShell });
  };
  return (
    <div className="flex gap-2 flex-wrap">
      <CustomSelect value={ctx.os} onChange={handleOsChange} options={OS_OPTIONS} />
      <CustomSelect value={ctx.shell} onChange={(newShell) => setCtx({ ...ctx, shell: newShell })} options={SHELL_OPTIONS[ctx.os] || []} />
      <CustomSelect value={ctx.type} onChange={(newType) => setCtx({ ...ctx, type: newType })} options={TYPE_OPTIONS} />
    </div>
  );
};

export default ContextDropdowns;