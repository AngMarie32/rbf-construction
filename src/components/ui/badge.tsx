
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-gray-100 text-gray-800",
        primary:
          "bg-gradient-to-r from-primary to-primary-600 text-primary-foreground hover:shadow-md",
        secondary:
          "bg-gradient-to-r from-gray-100 to-gray-200 text-secondary-foreground hover:from-gray-200 hover:to-gray-300",
        destructive:
          "bg-gradient-to-r from-red-100 to-red-200 text-red-800 hover:from-red-200 hover:to-red-300",
        outline: "bg-gray-100 text-foreground hover:bg-gray-200",
        success: "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 hover:from-emerald-200 hover:to-emerald-300",
        warning: "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 hover:from-amber-200 hover:to-amber-300",
        info: "bg-gradient-to-r from-blue-100 to-blue-200/80 text-blue-800 hover:from-blue-200 hover:to-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
