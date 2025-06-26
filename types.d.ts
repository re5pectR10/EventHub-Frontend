// Fix for React 19 type compatibility issues
declare module "react" {
  interface ReactElement {
    children?: React.ReactNode;
  }
}

// Fix ReactNode compatibility between different type versions
declare global {
  namespace React {
    type ReactNode = import("react").ReactNode;
  }
}

export {};
