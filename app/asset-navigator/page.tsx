import { Search, ExternalLink, FolderOpen, Network } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Suspense } from "react"

function AssetNavigatorContent() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Asset Navigator</h2>
          <p className="text-muted-foreground">C09 | ShotGrid integration for file paths and dependency tracking</p>
        </div>
        <Badge variant="outline" className="h-6">
          C09
        </Badge>
      </div>

      {/* Path Resolver */}
      <Card>
        <CardHeader>
          <CardTitle>Path Resolver</CardTitle>
          <CardDescription>Enter shot/version to get correct file paths</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Shot ID</Label>
              <Input placeholder="Shot_005_v04" />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input placeholder="v04" />
            </div>
          </div>
          <Button className="w-full">
            <Search className="mr-2 h-4 w-4" />
            Resolve Path
          </Button>

          <div className="mt-6 space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Storage Root:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">/mnt/vfx/projects/chronos</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Publish Path:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">/shots/seq_a/shot_005/publish/v04</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Version Path:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">/work/comp/shot_005_comp_v04.nk</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Proxy Path:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">/proxies/shot_005_v04_1080p.mov</code>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* DCC Launcher Links */}
        <Card>
          <CardHeader>
            <CardTitle>DCC Launcher</CardTitle>
            <CardDescription>Open in digital content creation tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <FolderOpen className="mr-2 h-4 w-4" />
              Open in Nuke
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <FolderOpen className="mr-2 h-4 w-4" />
              Open in After Effects
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <FolderOpen className="mr-2 h-4 w-4" />
              Open in Premiere Pro
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <FolderOpen className="mr-2 h-4 w-4" />
              Open in Unreal Engine
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in ShotGrid
            </Button>
          </CardContent>
        </Card>

        {/* Dependency Graph */}
        <Card>
          <CardHeader>
            <CardTitle>Dependency Graph</CardTitle>
            <CardDescription>Assets and references used in this version</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-blue-500" />
                <span>Dragon_Texture_v02.exr</span>
              </div>
              <Badge variant="secondary">Texture</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-green-500" />
                <span>BG_Plate_v01.dpx</span>
              </div>
              <Badge variant="secondary">Plate</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-purple-500" />
                <span>Ref_Lighting_Final.jpg</span>
              </div>
              <Badge variant="secondary">Reference</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-orange-500" />
                <span>CG_Dragon_v12.abc</span>
              </div>
              <Badge variant="secondary">3D Asset</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Cross-Platform Search</CardTitle>
          <CardDescription>Search across ShotGrid, folders, and notes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Search shots, versions, notes, files..." className="flex-1" />
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="shotgrid">ShotGrid Only</SelectItem>
                <SelectItem value="folders">Folders Only</SelectItem>
                <SelectItem value="notes">Notes Only</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AssetNavigatorPage() {
  return (
    <Suspense fallback={null}>
      <AssetNavigatorContent />
    </Suspense>
  )
}
