"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ItemFiltersProps {
  itemType: "food" | "non-food";
  searchTerm: string;
  categoryFilter: string;
  statusFilter: string;
  categories: string[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  formatCategoryName: (category: string) => string;
}

export default function ItemFilters({
  itemType,
  searchTerm,
  categoryFilter,
  statusFilter,
  categories,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  formatCategoryName,
}: ItemFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search Bar - Full Width on Mobile */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          placeholder={`Search ${itemType} items...`}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12 pr-4 py-4 text-base mobile-text-base rounded-xl border-2 border-gray-200 focus:border-green-500 transition-colors w-full"
        />
      </div>

      {/* Filters - Horizontal Scroll on Mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:justify-start">
        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="min-w-[140px] h-12 px-4 rounded-xl border-2 border-gray-200 bg-white hover:border-green-300 transition-colors">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {formatCategoryName(category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="min-w-[120px] h-12 px-4 rounded-xl border-2 border-gray-200 bg-white hover:border-green-300 transition-colors">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="requested">Requested</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

