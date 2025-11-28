import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-normal transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wp-admin-blue focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-wp-admin-blue text-white border border-wp-admin-blue rounded hover:bg-wp-admin-blue-hover active:bg-wp-admin-blue-active",
        destructive:
          "bg-wp-danger text-white border border-wp-danger rounded hover:bg-[#b32d2e]",
        outline:
          "border border-wp-admin-blue bg-white text-wp-admin-blue rounded hover:bg-[#e5f5fa]",
        secondary:
          "bg-wp-gray-10 text-wp-gray-700 border border-wp-gray-100 rounded hover:bg-white hover:border-wp-gray-300",
        ghost: "bg-transparent text-wp-gray-700 border-transparent rounded hover:bg-wp-gray-25",
        link: "text-wp-admin-blue underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3 py-1",
        sm: "h-7 px-2.5 text-xs",
        lg: "h-9 px-4 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
