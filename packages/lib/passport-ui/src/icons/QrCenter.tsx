import * as React from "react";
import type { SVGProps } from "react";
const SvgQrCenter = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={56}
    height={56}
    fill="none"
    {...props}
  >
    <circle cx={28} cy={28} r={28} fill="#19473F" />
    <path
      fill="#fff"
      d="M27.78 54.343C13.565 54.343 2 42.603 2 28.172S13.565 2 27.78 2s25.78 11.74 25.78 26.172c0 14.43-11.565 26.171-25.78 26.171m0-51.423c-13.715 0-24.874 11.328-24.874 25.252S14.065 53.423 27.78 53.423s24.874-11.328 24.874-25.251S41.495 2.92 27.78 2.92"
    />
    <path
      fill="#fff"
      d="M27.71 51.844a23.13 23.13 0 0 0 12.84-3.9 23.65 23.65 0 0 0 8.62-10.42l-2.543-1.534v-6.21l-6.04-3.175V39.67h-2.563v5.646h-.956V9.492l-5.946 6.036v8.112l-4.248 4.308v17.36h-.976v-8.605l-3.047-2.117V45.31h-.973V27.736L17.151 31.9V45.31h-1.526v-5.294h-.906v-3.387H12v-10.09l-3.683 2.759v9.31L7.24 39.6a23.56 23.56 0 0 0 8.587 8.96 23.1 23.1 0 0 0 11.882 3.285"
    />
  </svg>
);
export default SvgQrCenter;
