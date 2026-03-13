"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"

function VerifyContent() {
  const router = useRouter()
  const params = useSearchParams()
  const token  = params.get("token") || ""

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("無效的驗證連結，請重新註冊或申請重發驗證信。")
      return
    }
    fetch(`${API}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (ok) {
          setStatus("success")
          setMessage(data.message || "電子郵件驗證成功！")
          setTimeout(() => router.push("/auth"), 3000)
        } else {
          setStatus("error")
          setMessage(data.detail || "驗證失敗，連結可能已過期。")
        }
      })
      .catch(() => {
        setStatus("error")
        setMessage("無法連線至伺服器，請稍後再試。")
      })
  }, [token, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">VFX</span>
          </div>
          <span className="text-2xl font-bold">MoonWalk</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {status === "loading" && <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />}
              {status === "success" && <CheckCircle2 className="w-12 h-12 text-green-600" />}
              {status === "error"   && <AlertCircle  className="w-12 h-12 text-red-500" />}
            </div>
            <CardTitle>
              {status === "loading" && "驗證中..."}
              {status === "success" && "驗證成功！"}
              {status === "error"   && "驗證失敗"}
            </CardTitle>
            <CardDescription className={
              status === "success" ? "text-green-700" :
              status === "error"   ? "text-red-600"   : ""
            }>
              {message || "正在驗證您的電子郵件，請稍候..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {status === "success" && (
              <p className="text-center text-sm text-muted-foreground">3秒後自動跳轉至登入頁面...</p>
            )}
            {status === "error" && (
              <>
                <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={() => router.push("/auth")}>
                  返回登入 / 重新申請
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return <Suspense fallback={
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
    </div>
  }><VerifyContent /></Suspense>
}