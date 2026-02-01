import { Database, Shield, Lock, Eye, FileCheck, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

export default function DataPrivacyPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Data & Privacy Console</h2>
          <p className="text-muted-foreground">C12 | Data pools, policy rules, and privacy controls</p>
        </div>
        <Badge variant="outline" className="h-6">
          C12
        </Badge>
      </div>

      {/* Policy Overview */}
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Active Policy Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Draft assets excluded from training</p>
              <p className="text-sm text-muted-foreground">
                Only Final-grade assets can be used for model training to prevent pollution
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">External references require approval</p>
              <p className="text-sm text-muted-foreground">
                Supervisor must approve license terms before adding to training pool
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Project finetune weights are private</p>
              <p className="text-sm text-muted-foreground">On-prem only, no cross-project reuse without re-approval</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Pools */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              Draft Pool
            </CardTitle>
            <CardDescription>Work-in-progress assets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold">2,847</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Training:</span>
                <Badge variant="secondary">Disabled</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">View Access:</span>
                <Badge variant="secondary">Team Only</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quality Grade:</span>
                <Badge variant="outline">WIP</Badge>
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Used for reference viewing only. Never included in model training to prevent quality pollution.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-green-500" />
              Final Pool
            </CardTitle>
            <CardDescription>Approved, final-grade assets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold">156</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Training:</span>
                <Badge className="bg-green-500">Enabled</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">View Access:</span>
                <Badge variant="secondary">Team + Client</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quality Grade:</span>
                <Badge className="bg-green-500">Final</Badge>
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              High-quality assets approved for training and client sharing. Primary source for AI learning.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-500" />
              External Ref Pool
            </CardTitle>
            <CardDescription>Third-party references</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold">89</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Training:</span>
                <Badge variant="outline">Needs Approval</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">View Access:</span>
                <Badge variant="secondary">Team Only</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quality Grade:</span>
                <Badge variant="outline">External</Badge>
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              External references require license review and supervisor approval before training use.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Policy Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Policy Rules</CardTitle>
          <CardDescription>Configure data usage permissions and restrictions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Data Origin</Label>
              <Select defaultValue="internal">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="client">Client-Provided</SelectItem>
                  <SelectItem value="external">External Reference</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quality Grade</Label>
              <Select defaultValue="final">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wip">WIP/Draft</SelectItem>
                  <SelectItem value="final">Final-Grade</SelectItem>
                  <SelectItem value="approved">Client-Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Confidentiality</Label>
              <Select defaultValue="internal">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal Only</SelectItem>
                  <SelectItem value="nda">NDA-Strict</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Allowed Use</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <Label className="font-normal">View-only (reference lookup)</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <Label className="font-normal">Training-ok (model fine-tuning)</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <Label className="font-normal">Client-share-ok (external distribution)</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <Label className="font-normal">Cross-project reuse</Label>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Retention Policy</Label>
            <Select defaultValue="project">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">Project Duration Only</SelectItem>
                <SelectItem value="1year">1 Year After Delivery</SelectItem>
                <SelectItem value="3year">3 Years After Delivery</SelectItem>
                <SelectItem value="permanent">Permanent Archive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Audit Log
          </CardTitle>
          <CardDescription>Track who accessed or modified data policies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm border-b pb-3">
              <div className="space-y-1">
                <p className="font-medium">Sarah L. added 15 refs to Training Pool</p>
                <p className="text-muted-foreground text-xs">All assets verified as Final-grade, license approved</p>
              </div>
              <span className="text-muted-foreground text-xs">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between text-sm border-b pb-3">
              <div className="space-y-1">
                <p className="font-medium">Alex Chen changed retention policy</p>
                <p className="text-muted-foreground text-xs">Updated from "1 Year" to "3 Years After Delivery"</p>
              </div>
              <span className="text-muted-foreground text-xs">1 day ago</span>
            </div>
            <div className="flex items-center justify-between text-sm border-b pb-3">
              <div className="space-y-1">
                <p className="font-medium">Mike T. requested external ref training approval</p>
                <p className="text-muted-foreground text-xs">Ref_External_089.jpg - Pending supervisor review</p>
              </div>
              <span className="text-muted-foreground text-xs">2 days ago</span>
            </div>
            <div className="flex items-center justify-between text-sm border-b pb-3">
              <div className="space-y-1">
                <p className="font-medium text-red-500">Security Alert: Unauthorized download attempt</p>
                <p className="text-muted-foreground text-xs">Blocked attempt to export NDA-Strict asset</p>
              </div>
              <span className="text-muted-foreground text-xs">3 days ago</span>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4 bg-transparent">
            View Full Audit History
          </Button>
        </CardContent>
      </Card>

      {/* Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Export Controls</CardTitle>
          <CardDescription>Restrictions on data export and sharing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Download Restrictions
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <Label className="font-normal text-sm">Prevent bulk downloads</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <Label className="font-normal text-sm">Watermark all exports</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <Label className="font-normal text-sm">Require approval for Final-grade assets</Label>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Access Expiration
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <Label className="font-normal text-sm">Revoke client access post-delivery</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <Label className="font-normal text-sm">Auto-expire contractor permissions</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <Label className="font-normal text-sm">Time-limited links (7 days)</Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
