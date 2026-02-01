import { AlertTriangle, CheckCircle2, Clock, Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export default function NotificationsPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notifications & Gates</h2>
          <p className="text-muted-foreground">C10 | Mandatory reminders and checkpoint controls</p>
        </div>
        <Badge variant="outline" className="h-6">
          C10
        </Badge>
      </div>

      {/* Attention Summary */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-500" />
            Top 3 Priorities Today
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-red-500 text-sm font-bold">
              1
            </div>
            <div className="flex-1">
              <p className="font-medium">Review Shot_005_v04 - Waiting 48 hours</p>
              <p className="text-sm text-muted-foreground">Director needs your feedback before team can proceed</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/20 text-orange-500 text-sm font-bold">
              2
            </div>
            <div className="flex-1">
              <p className="font-medium">3 Assets failed Technical QA</p>
              <p className="text-sm text-muted-foreground">Dragon texture has exposure issues - blocking 5 shots</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-500 text-sm font-bold">
              3
            </div>
            <div className="flex-1">
              <p className="font-medium">Daily Review Checklist Incomplete</p>
              <p className="text-sm text-muted-foreground">5 items remaining before end of day</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Mandatory Pop-up Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Mandatory Pop-up Rules</CardTitle>
            <CardDescription>Gates that must be acknowledged</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Brief must be read before opening shot</Label>
                <p className="text-sm text-muted-foreground">Prevent working without context</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>QA must pass before submit for review</Label>
                <p className="text-sm text-muted-foreground">Technical validation required</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show latest feedback on file open</Label>
                <p className="text-sm text-muted-foreground">Display unread comments</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Reference location reminder</Label>
                <p className="text-sm text-muted-foreground">Show where refs are stored</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Daily Review Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Review Checklist</CardTitle>
            <CardDescription>End-of-day inspection items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm">All feedback addressed or acknowledged</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm">Work files backed up to server</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Notes updated in ShotGrid</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Tomorrow's priorities listed</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">Dependencies documented</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Controls */}
      <Card>
        <CardHeader>
          <CardTitle>"Do Not Spam" Controls</CardTitle>
          <CardDescription>Frequency limits to prevent notification fatigue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Same Issue Throttle</Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={24}
                  className="w-16 rounded border bg-background px-2 py-1 text-sm"
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
              <p className="text-xs text-muted-foreground">Only remind once per period for same topic</p>
            </div>
            <div className="space-y-2">
              <Label>Daily Maximum</Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={10}
                  className="w-16 rounded border bg-background px-2 py-1 text-sm"
                />
                <span className="text-sm text-muted-foreground">notifications</span>
              </div>
              <p className="text-xs text-muted-foreground">Max notifications per day</p>
            </div>
            <div className="space-y-2">
              <Label>Quiet Hours</Label>
              <div className="flex items-center gap-2">
                <input type="time" defaultValue="22:00" className="rounded border bg-background px-2 py-1 text-sm" />
                <span className="text-sm text-muted-foreground">to</span>
                <input type="time" defaultValue="08:00" className="rounded border bg-background px-2 py-1 text-sm" />
              </div>
              <p className="text-xs text-muted-foreground">No notifications during these hours</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gate Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gate Configuration (Supervisor/Director Only)
          </CardTitle>
          <CardDescription>Set requirements that block progression</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium">Submit for Review Gate</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <Label className="font-normal">Brief must be marked as "Read"</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <Label className="font-normal">Technical QA must pass</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <Label className="font-normal">Motion review checklist complete</Label>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium">Mark as Final Gate</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <Label className="font-normal">Director approval required</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <Label className="font-normal">All feedback threads resolved</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <Label className="font-normal">Client-facing QA passed</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
