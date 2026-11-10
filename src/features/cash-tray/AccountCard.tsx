import { useNavigate } from 'react-router'
import type { PendingAccountCardDTO } from '../../api/contracts/pendingAccounts'
import { chargePath } from '../../app/routes'
import { Badge, Button, Card } from '../../components/ui'
import { displayTableName, displayWaiterName } from '../../lib/displayNames'
import { formatCurrency } from '../../lib/money'
import { formatItemCount, formatWait, itemCount, preAccountStatusLabel, waitMinutes, waitSeverity } from './accountsView'

/** PMC-19 AC3: card of an account ready to be charged. */
export function AccountCard({ account, now }: Readonly<{ account: PendingAccountCardDTO; now: number }>) {
  const navigate = useNavigate()
  const minutes = waitMinutes(account.timestamp, now)
  const tableId = `account-table-${account.dinning_session_id}`

  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Badge id={tableId} variant="dark" className="text-small">
          {displayTableName(account)}
        </Badge>
        <Badge variant={waitSeverity(minutes)} withDot>
          {formatWait(minutes)}
        </Badge>
      </div>

      <div>
        <p className="text-small text-muted">{account.order_folio}</p>
        <p className="text-body font-semibold text-text">Mesero: {displayWaiterName(account)}</p>
      </div>

      <div className="mt-auto">
        <p className="text-h2 text-ink">{formatCurrency(account.totals.expected_total)}</p>
        <p className="text-small text-muted">
          {formatItemCount(itemCount(account))}
          {account.pre_account_status && ` • ${preAccountStatusLabel(account.pre_account_status)}`}
        </p>
      </div>

      <Button
        size="lg"
        fullWidth
        aria-describedby={tableId}
        onClick={() => navigate(chargePath(account.dinning_session_id))}
      >
        Procesar cobro
      </Button>
    </Card>
  )
}

/** PMC-19 AC5: placeholder with the same shape as a card, shown during the first load. */
export function AccountCardSkeleton() {
  return (
    <Card className="flex h-full flex-col gap-4" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="h-7 w-20 animate-pulse rounded-full bg-border" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-border" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-24 animate-pulse rounded-sm bg-border" />
        <div className="h-5 w-36 animate-pulse rounded-sm bg-border" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-8 w-32 animate-pulse rounded-sm bg-border" />
        <div className="h-4 w-48 animate-pulse rounded-sm bg-border" />
      </div>
      <div className="h-12 w-full animate-pulse rounded-control bg-border" />
    </Card>
  )
}
