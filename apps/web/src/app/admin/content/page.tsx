"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock, Filter, Plus, Search, Tag, Trash2 } from "lucide-react";
import { useState } from "react";

import { orpc } from "@/utils/orpc";

interface ContentItem {
  cefrLevel: string;
  createdAt: string;
  description: string;
  duration: number | null;
  id: string;
  tags: string[];
  title: string;
  type: string;
}

const typeFilters = [
  "all",
  "video",
  "article",
  "exercise",
  "dialogue",
] as const;
const cefrFilters = ["all", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

export default function AdminContentPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [cefrFilter, setCefrFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data: content,
    isLoading,
    refetch,
  } = useQuery(
    orpc.recommendations.listContent.queryOptions({
      input: { limit: 100, offset: 0 },
    })
  );

  const deleteMutation = useMutation(
    orpc.recommendations.adminDeleteContent.mutationOptions()
  );

  const createMutation = useMutation(
    orpc.recommendations.createContent.mutationOptions()
  );

  const items = (content as ContentItem[] | undefined) ?? [];

  const filtered = items.filter((item) => {
    const matchesSearch =
      search === "" ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesCefr = cefrFilter === "all" || item.cefrLevel === cefrFilter;
    return matchesSearch && matchesType && matchesCefr;
  });

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId }, { onSuccess: () => refetch() });
      setDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteId(null);
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const tags = (formData.get("tags") as string)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    createMutation.mutate(
      {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        type: formData.get("type") as
          | "video"
          | "article"
          | "exercise"
          | "dialogue",
        cefrLevel: formData.get("cefrLevel") as
          | "A1"
          | "A2"
          | "B1"
          | "B2"
          | "C1"
          | "C2",
        duration: Number(formData.get("duration")) || undefined,
        tags,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          refetch();
        },
      }
    );
  };

  const typeEmoji = {
    video: "▶️",
    article: "📄",
    exercise: "✏️",
    dialogue: "💬",
  } as Record<string, string>;

  const cefrColor = {
    A1: "bg-green-100 text-green-800",
    A2: "bg-green-200 text-green-800",
    B1: "bg-yellow-100 text-yellow-800",
    B2: "bg-yellow-200 text-yellow-800",
    C1: "bg-orange-100 text-orange-800",
    C2: "bg-red-100 text-red-800",
  } as Record<string, string>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-md border bg-background py-2 pr-4 pl-9 text-sm"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content..."
            type="text"
            value={search}
          />
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          onClick={() => setShowCreate(true)}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Add Content
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground text-sm">Type:</span>
          {typeFilters.map((t) => (
            <button
              className={`rounded-md px-3 py-1 text-sm ${
                typeFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "border hover:bg-accent"
              }`}
              key={t}
              onClick={() => setTypeFilter(t)}
              type="button"
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">CEFR:</span>
          {cefrFilters.map((c) => (
            <button
              className={`rounded-md px-3 py-1 text-sm ${
                cefrFilter === c
                  ? "bg-primary text-primary-foreground"
                  : "border hover:bg-accent"
              }`}
              key={c}
              onClick={() => setCefrFilter(c)}
              type="button"
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-4 font-semibold">Create New Content</h3>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
            <div className="sm:col-span-2">
              <label className="mb-1 block font-medium text-sm" htmlFor="title">
                Title
              </label>
              <input
                className="w-full rounded-md border px-3 py-2"
                id="title"
                name="title"
                required
                type="text"
              />
            </div>
            <div className="sm:col-span-2">
              <label
                className="mb-1 block font-medium text-sm"
                htmlFor="description"
              >
                Description
              </label>
              <textarea
                className="w-full rounded-md border px-3 py-2"
                id="description"
                name="description"
                required
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-sm" htmlFor="type">
                Type
              </label>
              <select
                className="w-full rounded-md border px-3 py-2"
                id="type"
                name="type"
              >
                <option value="video">Video</option>
                <option value="article">Article</option>
                <option value="exercise">Exercise</option>
                <option value="dialogue">Dialogue</option>
              </select>
            </div>
            <div>
              <label
                className="mb-1 block font-medium text-sm"
                htmlFor="cefrLevel"
              >
                CEFR Level
              </label>
              <select
                className="w-full rounded-md border px-3 py-2"
                id="cefrLevel"
                name="cefrLevel"
              >
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
              </select>
            </div>
            <div>
              <label
                className="mb-1 block font-medium text-sm"
                htmlFor="duration"
              >
                Duration (seconds)
              </label>
              <input
                className="w-full rounded-md border px-3 py-2"
                id="duration"
                name="duration"
                type="number"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-sm" htmlFor="tags">
                Tags (comma separated)
              </label>
              <input
                className="w-full rounded-md border px-3 py-2"
                id="tags"
                name="tags"
                placeholder="grammar, vocabulary, travel"
                type="text"
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
                type="submit"
              >
                Create
              </button>
              <button
                className="rounded-md border px-4 py-2"
                onClick={() => setShowCreate(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content Table */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-12 gap-4 border-b px-4 py-3 font-medium text-muted-foreground text-sm">
            <div className="col-span-4">Title</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">CEFR</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y">
            {filtered.map((item) => (
              <div
                className="grid grid-cols-12 items-center gap-4 px-4 py-3"
                key={item.id}
              >
                <div className="col-span-4">
                  <p className="font-medium text-sm">{item.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
                        key={tag}
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-sm">
                    {typeEmoji[item.type] ?? "📚"} {item.type}
                  </span>
                </div>
                <div className="col-span-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium text-xs ${cefrColor[item.cefrLevel] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {item.cefrLevel}
                  </span>
                </div>
                <div className="col-span-2 text-muted-foreground text-sm">
                  {item.duration ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.floor(item.duration / 60)}m
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    className="rounded-md p-2 text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(item.id)}
                    title="Delete"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="mb-2 font-semibold">Delete Content</h3>
            <p className="mb-4 text-muted-foreground text-sm">
              Are you sure you want to delete this content? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md border px-4 py-2 text-sm"
                onClick={cancelDelete}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                onClick={confirmDelete}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No content found matching your filters.
        </div>
      )}
    </div>
  );
}
