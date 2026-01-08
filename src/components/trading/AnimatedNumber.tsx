import CountUp from 'react-countup';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({ 
  value, 
  prefix = '', 
  suffix = '', 
  decimals = 0,
  className = '',
  duration = 1.5
}: AnimatedNumberProps) {
  return (
    <CountUp
      end={value}
      prefix={prefix}
      suffix={suffix}
      decimals={decimals}
      duration={duration}
      separator=","
      preserveValue
      className={className}
    />
  );
}
