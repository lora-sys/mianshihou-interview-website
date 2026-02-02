"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@repo/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@repo/ui";
import { Badge } from "@repo/ui";
import { Input } from "@repo/ui";
import { Loader2, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

export default function QuestionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: questions, isLoading, error } = trpc.questions.list.useQuery();
  const deleteMutation = trpc.questions.delete.useMutation();

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "简单":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "中等":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "困难":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "单选题":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "多选题":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      case "判断题":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20";
      case "简答题":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const filteredQuestions =
    questions?.data?.filter(
      (q) =>
        q.questionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.questionContent.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">加载题目列表...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3L21 12c0 1.103-.884 2-1.972 2z"
            />
          </svg>
        </div>
        <p className="text-destructive font-medium">加载题目列表失败</p>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部区域 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            题目列表
          </h1>
          <p className="text-muted-foreground mt-2">管理和查看所有面试题目</p>
        </div>
        <Button className="shadow-md">
          <Plus className="w-4 h-4 mr-2" />
          新增题目
        </Button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索题目..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* 统计信息 */}
      {filteredQuestions.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>共 {filteredQuestions.length} 道题目</span>
          {searchQuery && (
            <>
              <span>•</span>
              <span>搜索结果: {filteredQuestions.length} 道</span>
            </>
          )}
        </div>
      )}

      {/* 题目列表 */}
      <div className="grid gap-4">
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map((question, index) => (
            <Card
              key={question.id}
              className="shadow-md hover:shadow-lg transition-all border-border/50"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg hover:text-primary transition-colors cursor-pointer line-clamp-1">
                          {question.questionTitle}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge
                            className={getTypeColor(question.questionType)}
                          >
                            {question.questionType}
                          </Badge>
                          <Badge
                            className={getDifficultyColor(question.difficulty)}
                          >
                            {question.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: question.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                  {question.questionContent}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <svg
                  className="w-10 h-10 text-muted-foreground/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <CardDescription className="text-base mb-4">
                {searchQuery ? "没有找到匹配的题目" : "暂无题目"}
              </CardDescription>
              {!searchQuery && (
                <Button className="shadow-md" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  创建第一个题目
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
