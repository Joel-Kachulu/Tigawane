"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Package,
  Edit,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";
import { formatDistance } from "@/lib/locationService";

interface ItemRecord {
  id: string;
  title: string;
  description: string | null;
  category: string;
  item_type: "food" | "non-food";
  quantity: string;
  condition?: string | null;
  expiry_date?: string | null;
  pickup_location: string;
  image_url: string | null;
  user_id: string;
  status: string;
  created_at: string;
  pickup_label?: string | null;
  distance_m?: number | null;
}

interface ItemCardProps {
  item: ItemRecord;
  index: number;
  isMobile: boolean;
  currentUserId?: string;
  requestCount?: number;
  requestingItems: Set<string>;
  profiles: Record<string, any>;
  formatCategoryName: (category: string) => string;
  getExpiryUrgency: (expiryDate: string) => {
    level: string;
    color: string;
    text: string;
  };
  onClaim: (item: ItemRecord) => void;
  onEdit: (item: ItemRecord) => void;
  onDelete: (itemId: string) => void;
}

export default function ItemCard({
  item,
  index,
  isMobile,
  currentUserId,
  requestCount = 0,
  requestingItems,
  profiles,
  formatCategoryName,
  getExpiryUrgency,
  onClaim,
  onEdit,
  onDelete,
}: ItemCardProps) {
  const urgency = item.expiry_date ? getExpiryUrgency(item.expiry_date) : null;
  const isPriority = isMobile ? index < 3 : index < 8;
  const isOwner = currentUserId === item.user_id;
  const canClaim = currentUserId && !isOwner && item.status === "available";

  if (isMobile) {
    return (
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 hover:border-green-300 bg-white rounded-2xl relative">
        <div className="flex min-h-36">
          {/* Image Section */}
          <div className="relative w-32 min-h-36 flex-shrink-0 overflow-hidden rounded-l-2xl bg-gradient-to-br from-gray-50 to-gray-100">
            {item.image_url ? (
              <ImageWithFallback
                src={item.image_url}
                alt={item.title}
                className="object-cover object-center w-full h-full rounded-xl group-hover:scale-105 transition-transform duration-300"
                priority={isPriority}
                width={128}
                height={144}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-gray-400 bg-gray-100 rounded-xl">
                <ImageIcon className="h-8 w-8 mx-auto mb-1 text-gray-300" />
                <span className="text-xs font-medium">No image</span>
              </div>
            )}

            {/* Status Indicator */}
            <div className="absolute top-2 left-2">
              <div
                className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${
                  item.status === "available"
                    ? "bg-green-500"
                    : item.status === "requested"
                      ? "bg-amber-500"
                      : item.status === "reserved"
                        ? "bg-blue-500"
                        : "bg-gray-500"
                }`}
              ></div>
            </div>

            {/* Distance Badge */}
            {item.distance_m !== undefined &&
              item.distance_m !== null &&
              item.distance_m >= 0 && (
                <div className="absolute top-2 right-2">
                  <div className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg border-2 border-white">
                    {formatDistance(item.distance_m / 1000)}
                  </div>
                </div>
              )}
          </div>

          {/* Content Section */}
          <div className="flex-1 p-4 pr-20 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base text-gray-900 line-clamp-1 leading-tight group-hover:text-green-700 transition-colors mb-1">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-sm text-gray-600 line-clamp-2 leading-snug mb-2">
                  {item.description}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge
                  variant={"secondary" as const}
                  className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1"
                >
                  {formatCategoryName(item.category)}
                </Badge>
                <Badge
                  variant={
                    (item.status === "available"
                      ? "default"
                      : "secondary") as "default" | "secondary" | "destructive" | "outline"
                  }
                  className={`text-xs font-medium ${
                    item.status === "available"
                      ? "bg-green-500 text-white"
                      : item.status === "requested"
                        ? "bg-amber-100 text-amber-800"
                        : item.status === "reserved"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {item.status}
                </Badge>
                {item.status === "available" && requestCount > 0 && (
                  <Badge className="text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                    {requestCount} requests
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                  <Package className="h-3 w-3 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">{item.quantity}</span>
                </div>
                {item.condition && (
                  <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-medium text-blue-700">{item.condition}</span>
                  </div>
                )}
                {urgency && (
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                      urgency.color === "red"
                        ? "bg-red-100 text-red-700"
                        : urgency.color === "amber"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {urgency.color === "red" && <AlertCircle className="h-3 w-3" />}
                    {(urgency.color === "amber" || urgency.color === "green") && (
                      <CalendarDays className="h-3 w-3" />
                    )}
                    <span>{urgency.text}</span>
                  </div>
                )}
                {item.expiry_date && (
                  <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full font-medium">
                    Expires:{" "}
                    {new Date(item.expiry_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div
                className="flex items-center gap-1 text-xs text-gray-600"
                title={item.pickup_label ?? ""}
              >
                <MapPin className="h-3 w-3 shrink-0 text-gray-500" />
                <span className="line-clamp-1 font-medium">{item.pickup_label}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="truncate">
                  By {profiles[item.user_id]?.full_name || "Unknown"}
                </span>
                <span className="shrink-0">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="absolute bottom-3 right-3">
            {canClaim ? (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClaim(item);
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white hover:scale-105"
                disabled={requestingItems.has(item.id)}
              >
                {requestingItems.has(item.id) ? "..." : "Claim"}
              </Button>
            ) : isOwner ? (
              <div className="flex gap-2">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(item);
                  }}
                  variant={"outline" as const}
                  className="bg-white hover:bg-gray-50 border-gray-300 hover:border-green-500 text-gray-700 hover:text-green-700 font-medium py-2 px-3 rounded-full shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this item?")) {
                      onDelete(item.id);
                    }
                  }}
                  variant={"outline" as const}
                  className="bg-white hover:bg-red-50 border-gray-300 hover:border-red-500 text-gray-700 hover:text-red-700 font-medium py-2 px-3 rounded-full shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    );
  }

  // Desktop layout
  return (
    <div className="group bg-gradient-to-br from-white via-blue-50 to-green-50 border border-blue-200 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col min-h-[420px] max-h-[440px] relative overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="w-full h-40 flex-shrink-0 flex items-center justify-center bg-white border-b border-blue-100 relative">
          {item.image_url ? (
            <ImageWithFallback
              src={item.image_url}
              alt={item.title}
              className="object-contain w-full h-full rounded-t-2xl"
              style={{ maxHeight: "160px" }}
              priority={isPriority}
              width={400}
              height={160}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-300">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
          {item.distance_m !== undefined &&
            item.distance_m !== null &&
            item.distance_m >= 0 && (
              <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg border-2 border-white z-10">
                {formatDistance(item.distance_m / 1000)}
              </span>
            )}
        </div>
        <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
          <div className="flex flex-col gap-1 overflow-hidden">
            <span className="font-bold text-base text-blue-900 break-words whitespace-normal">
              {item.title}
            </span>
            {item.description && (
              <div className="text-gray-700 text-sm break-words whitespace-normal line-clamp-2">
                {item.description}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1">
                {formatCategoryName(item.category)}
              </Badge>
              <Badge
                className={`text-xs font-medium ${
                  item.status === "available"
                    ? "bg-green-500 text-white"
                    : item.status === "requested"
                      ? "bg-amber-100 text-amber-800"
                      : item.status === "reserved"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                }`}
              >
                {item.status}
              </Badge>
              {item.status === "available" && requestCount > 0 && (
                <Badge className="text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                  {requestCount} requests
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
              <Package className="h-3 w-3" />
              <span>{item.quantity}</span>
              {item.condition && (
                <>
                  <span>•</span>
                  <span>{item.condition}</span>
                </>
              )}
            </div>
            {urgency && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold mt-2 ${
                  urgency.color === "red"
                    ? "bg-red-100 text-red-700"
                    : urgency.color === "amber"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                }`}
              >
                {urgency.color === "red" && <AlertCircle className="h-3 w-3" />}
                {(urgency.color === "amber" || urgency.color === "green") && (
                  <CalendarDays className="h-3 w-3" />
                )}
                <span>{urgency.text}</span>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-blue-100">
            <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{item.pickup_label}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
              <span>By {profiles[item.user_id]?.full_name || "Unknown"}</span>
              <span>{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            {canClaim ? (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClaim(item);
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                disabled={requestingItems.has(item.id)}
              >
                {requestingItems.has(item.id) ? "..." : "Claim"}
              </Button>
            ) : isOwner ? (
              <div className="flex gap-2">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(item);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this item?")) {
                      onDelete(item.id);
                    }
                  }}
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 hover:border-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

