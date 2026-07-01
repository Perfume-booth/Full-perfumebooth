"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface DockProps {
  className?: string
  items: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    onClick?: () => void
    href?: string
    target?: string
    badge?: number
  }[]
}

export default function Dock({ items, className }: DockProps) {
  const [active, setActive] = React.useState<string | null>(null)
  const [hovered, setHovered] = React.useState<number | null>(null)

  return (
    <div className={cn("flex items-center justify-center w-full py-12", className)}>
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className={cn(
          "flex items-end gap-4 px-4 py-1 rounded-3xl",
          " bg-background backdrop-blur-2xl shadow-lg"
        )}
        style={{
          transform: "perspective(600px) rotateX(10deg)",
        }}
      >
          {items.map((item, i) => {
            const isActive = active === item.label
            const isHovered = hovered === i

            const content = (
              <motion.div
                key={item.label}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                animate={{
                  scale: isHovered ? 1.2 : 1,
                  rotate: isHovered ? -5 : 0,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative flex flex-col items-center"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-2xl relative",
                    "transition-colors",
                    isHovered && "shadow-lg shadow-primary/20"
                  )}
                  onClick={() => {
                    setActive(item.label)
                    item.onClick?.()
                  }}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-primary" : "text-foreground"
                    )}
                  />
                  {/* Glowing ring effect */}
                  {isHovered && (
                    <motion.span
                      layoutId="glow"
                      className="absolute inset-0 rounded-2xl  border-primary/40"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                  {/* Badge */}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[var(--color-maroon,#8b1a2b)] text-white text-[9px] font-bold min-w-[16px] min-h-[16px] flex items-center justify-center rounded-full leading-none z-10">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Button>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="dot"
                    className="w-1.5 h-1.5 rounded-full bg-primary mt-1"
                  />
                )}
              </motion.div>
            )

            // If the item has an href, wrap in a link
            if (item.href) {
              return (
                <a 
                  key={item.label} 
                  href={item.href} 
                  target={item.target}
                  rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                >
                  {content}
                </a>
              )
            }

            return content
          })}
      </motion.div>
    </div>
  )
}
