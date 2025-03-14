import type { Metadata } from 'next'
import Monitor from "@/components/monitor/monitor";
 
export const metadata: Metadata = {
  title: 'Monitor',
};

export default function MonitorPage() {
  return (
    <Monitor />
  )
}
