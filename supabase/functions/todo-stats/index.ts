import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // CORS preflight 처리
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing Authorization header",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      )
    }

    // ✅ Supabase 클라이언트 생성 (환경변수 사용)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    // 토큰 유효성 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired JWT",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      )
    }

    // URL 파라미터에서 action 가져오기
    const url = new URL(req.url)
    const action = url.searchParams.get("action")

    if (action === "stats") {
      // Todo 통계 계산
      const { data: todos, error } = await supabase
        .from("todos")
        .select("*")

      if (error) throw error

      const stats = {
        total: todos.length,
        completed: todos.filter((t) => t.is_completed).length,
        pending: todos.filter((t) => !t.is_completed).length,
        high_priority: todos.filter(
          (t) => t.priority === "high" && !t.is_completed,
        ).length,
        completion_rate:
          todos.length > 0
            ? Math.round(
              (todos.filter((t) => t.is_completed).length / todos.length) *
                100,
            )
            : 0,
      }

      return new Response(
        JSON.stringify({ success: true, data: stats }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    if (action === "cleanup") {
      // 30일 이상 된 완료된 할 일 삭제
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data, error } = await supabase
        .from("todos")
        .delete()
        .eq("is_completed", true)
        .lt("updated_at", thirtyDaysAgo.toISOString())
        .select()

      if (error) throw error

      return new Response(
        JSON.stringify({
          success: true,
          message: `${data.length}개의 오래된 할 일이 삭제되었습니다.`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    // action이 없거나 잘못된 경우
    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid action. Use ?action=stats or ?action=cleanup",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error?.message ?? error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    )
  }
})
