import { Brain, Sparkles, Settings2, BookOpen, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

export default function PreferencesPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Preference Memory + Customization</h2>
          <p className="text-muted-foreground">C11 | Client/director preferences and model customization</p>
        </div>
        <Badge variant="outline" className="h-6">
          C11
        </Badge>
      </div>

      {/* Preference Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Preference Profile
          </CardTitle>
          <CardDescription>Client and director preferences, likes/dislikes, and terminology</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Profile Owner</Label>
            <Select defaultValue="director">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="director">Director - James Chen</SelectItem>
                <SelectItem value="client">Client - Netflix</SelectItem>
                <SelectItem value="supervisor">VFX Supervisor - Alex Chen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Likes & Preferences</Label>
            <Textarea
              placeholder="e.g., Prefers warm color grading, likes dynamic camera movements, appreciates subtle texture details..."
              className="min-h-[100px]"
              defaultValue="- Prefers moody, desaturated color palettes&#10;- Likes practical lighting with hard shadows&#10;- Appreciates visible texture and grain&#10;- Favors slow, deliberate camera movements"
            />
          </div>

          <div className="space-y-2">
            <Label>Dislikes & Avoid</Label>
            <Textarea
              placeholder="e.g., Avoid overly saturated colors, no shaky cam, minimize lens flares..."
              className="min-h-[100px]"
              defaultValue="- No 'video game' look - too clean/perfect&#10;- Avoid overly warm skin tones&#10;- No fast cuts or whip pans&#10;- Minimize obvious CG elements"
            />
          </div>

          <div className="space-y-2">
            <Label>Do Not Do List (Critical)</Label>
            <Textarea
              placeholder="Absolute restrictions that must never be violated..."
              className="min-h-[80px]"
              defaultValue="- NEVER use bright, saturated blues&#10;- NEVER add motion blur to dragon scales&#10;- NEVER suggest 'stylized' looks"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Glossary / Terminology */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Custom Glossary
            </CardTitle>
            <CardDescription>Project-specific term definitions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">"Ominous"</span>
                <Badge variant="secondary">Term</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                For this project: Dark, low-key lighting with deep shadows. NOT scary or horror-like.
              </p>
            </div>
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">"Dynamic"</span>
                <Badge variant="secondary">Term</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Variation in lighting intensity across the frame. NOT camera movement.
              </p>
            </div>
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">"Organic"</span>
                <Badge variant="secondary">Term</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Natural, imperfect textures with variation. Must include surface irregularities.
              </p>
            </div>
            <Button variant="outline" className="w-full bg-transparent">
              Add New Term
            </Button>
          </CardContent>
        </Card>

        {/* Style Taxonomy */}
        <Card>
          <CardHeader>
            <CardTitle>Style Taxonomy</CardTitle>
            <CardDescription>Internal style classification system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">Lighting Style</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Naturalistic</Badge>
                <Badge variant="outline">High-Contrast</Badge>
                <Badge>Moody</Badge>
                <Badge variant="outline">Soft</Badge>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm">Color Palette</Label>
              <div className="flex flex-wrap gap-2">
                <Badge>Desaturated</Badge>
                <Badge variant="outline">Warm</Badge>
                <Badge variant="outline">Cool</Badge>
                <Badge variant="outline">Monochromatic</Badge>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm">Texture Treatment</Label>
              <div className="flex flex-wrap gap-2">
                <Badge>Highly Detailed</Badge>
                <Badge>Weathered</Badge>
                <Badge variant="outline">Clean</Badge>
                <Badge variant="outline">Stylized</Badge>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm">Motion Style</Label>
              <div className="flex flex-wrap gap-2">
                <Badge>Slow & Deliberate</Badge>
                <Badge variant="outline">Handheld</Badge>
                <Badge variant="outline">Locked-Off</Badge>
                <Badge variant="outline">Dynamic</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Model Configuration
          </CardTitle>
          <CardDescription>AI model and training settings for this project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Model Policy</Label>
              <Select defaultValue="internal">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">External Model (GPT-4, Claude)</SelectItem>
                  <SelectItem value="internal">Internal Finetune Only</SelectItem>
                  <SelectItem value="hybrid">Hybrid (External + LoRA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Training Pool</Label>
              <Select defaultValue="final">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="final">Final-Grade Refs Only</SelectItem>
                  <SelectItem value="approved">Approved Assets Only</SelectItem>
                  <SelectItem value="all">All Project Assets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3 bg-blue-500/5">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h4 className="font-medium">Project LoRA Active</h4>
                <p className="text-sm text-muted-foreground">
                  Custom fine-tuned model trained on 150 final-grade references from "Chronos Legacy"
                </p>
                <div className="flex gap-2">
                  <Badge variant="secondary">150 refs</Badge>
                  <Badge variant="secondary">Last trained: 2 days ago</Badge>
                  <Badge variant="secondary">On-Prem</Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <Label className="font-normal">Only use Final-grade references for training</Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <Label className="font-normal">Keep weights on-premises (no cloud export)</Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <Label className="font-normal">Allow cross-project reuse (requires approval)</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explainability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Explainability Panel
          </CardTitle>
          <CardDescription>Understand why AI made specific suggestions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium">Example: "Increase shadow density"</h4>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">This suggestion was based on:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Director preference: "Prefers moody, desaturated palettes"</li>
                <li>Reference match: Ref_124_Final.jpg (similarity: 87%)</li>
                <li>Glossary term: "Ominous" = low-key lighting with deep shadows</li>
                <li>Style taxonomy: Project tagged as "High-Contrast" + "Moody"</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                View Referenced Images
              </Button>
              <Button size="sm" variant="outline">
                See Similar Shots
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
