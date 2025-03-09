// Sensors - true/false
// Vital generators - target value and range
// Waveform generators - noiseLevel + optional items

import type { Metadata } from 'next'
import Manager from "@/components/manager/manager";
import { Suspense } from 'react';
 
export const metadata: Metadata = {
  title: 'Manager',
};

export default function ManagerPage() {
  return (
    <Suspense>
      <Manager />
    </Suspense>
  )
}
