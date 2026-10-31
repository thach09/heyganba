import {useState} from 'react';

/** Owner-approved raster artwork; the dark plate preserves its white wordmark in both themes. */
export function BrandLogo({compact=false}:{compact?:boolean}) {
  const [failed,setFailed]=useState(false);
  return <span className={`inline-flex shrink-0 items-center justify-center bg-brand-surface p-1 ${compact?'h-10 w-10':'h-12 w-[152px]'}`}>
    {failed ? <span className="font-sans text-base font-bold text-brand-ink">{compact?'J':'Jiayou'}</span> :
      <img src={compact?'/brand/jiayou-icon.png':'/brand/jiayou-wordmark-small.png'}
        srcSet={compact?undefined:'/brand/jiayou-wordmark-small.png 1x, /brand/jiayou-wordmark.png 2x'}
        width={compact?128:306} height={compact?128:98} alt="Jiayou" onError={()=>setFailed(true)}
        className="block h-full w-full object-contain" />}
  </span>;
}
