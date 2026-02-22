"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TaskCommentsProps {
  taskId: string;
  currentUserId: string;
  currentUserName: string;
}

export function TaskComments({ taskId, currentUserId, currentUserName }: TaskCommentsProps) {
  const comments = useQuery(api.taskComments.getCommentsByTask, { taskId });
  const addComment = useMutation(api.taskComments.addComment);
  const deleteComment = useMutation(api.taskComments.deleteComment);

  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const content = newComment.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    try {
      await addComment({ taskId, userId: currentUserId, content });
      setNewComment("");
    } finally {
      setSubmitting(false);
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="space-y-3">
      {/* Comments list */}
      {comments === undefined ? (
        <p className="text-xs text-gray-400">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          No comments yet — be the first to add context.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment._id} className="space-y-1.5">
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback className="text-[10px] bg-gray-200 text-gray-600">
                      {getInitials(comment.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold text-gray-800 truncate">
                    {comment.userName}
                  </span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {comment.userId === currentUserId && (
                  <button
                    onClick={() => deleteComment({ commentId: comment._id })}
                    className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                    aria-label="Delete comment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      <div className="space-y-2 pt-1">
        <div className="relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
            placeholder="Add context for whoever picks this up..."
            rows={2}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <span className="absolute bottom-2 right-2 text-[10px] text-gray-300">
            {newComment.length}/500
          </span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim() || submitting}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <MessageSquare className="h-3 w-3" />
          {submitting ? "Adding..." : "Add Comment"}
        </button>
      </div>
    </div>
  );
}
