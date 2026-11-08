import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { cardClassName, type CardPadding } from './cardClassName'

export interface CardProps extends ComponentProps<'div'> {
  padding?: CardPadding
}

export function Card({ padding = 'md', className, ...props }: CardProps) {
  return <div className={cn(cardClassName(padding), className)} {...props} />
}
