import { ReactNode, useState } from 'react';

interface AccordionProps {
  className?: string;
  children: ReactNode;
}

interface AccordionItemProps {
  className?: string;
  children: ReactNode;
  value: string;
}

interface AccordionTriggerProps {
  className?: string;
  children: ReactNode;
}

interface AccordionContentProps {
  className?: string;
  children: ReactNode;
}

export function Accordion({ className = '', children }: AccordionProps) {
  return <div className={`${className}`}>{children}</div>;
}

export function AccordionItem({ className = '', children, value }: AccordionItemProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div 
      className={`border-b ${className}`} 
      data-state={expanded ? 'open' : 'closed'} 
      data-value={value}
    >
      {children}
    </div>
  );
}

export function AccordionTrigger({ className = '', children }: AccordionTriggerProps) {
  return (
    <div className={`flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180 ${className}`}>
      {children}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="h-4 w-4 shrink-0 transition-transform duration-200"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  );
}

export function AccordionContent({ className = '', children }: AccordionContentProps) {
  return (
    <div className={`overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down ${className}`}>
      <div className="pb-4 pt-0">{children}</div>
    </div>
  );
}