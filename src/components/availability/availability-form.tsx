"use client";

import { useState } from "react";
import { When2MeetGrid } from "./when2meet-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTimeSlotCount } from "@/lib/utils";
import type { AvailabilityGrid } from "@/types/database";

interface AvailabilityFormProps {
  initialValue?: AvailabilityGrid;
  onSave: (value: AvailabilityGrid) => Promise<void>;
  showConsultAvailability?: boolean;
}

export function AvailabilityForm({
  initialValue,
  onSave,
  showConsultAvailability = false,
}: AvailabilityFormProps) {
  const slotCount = getTimeSlotCount();
  const emptyGrid = Array(7).fill(null).map(() => Array(slotCount).fill(false));

  const [weeklyGrid, setWeeklyGrid] = useState<boolean[][]>(
    initialValue?.weekly_grid || emptyGrid
  );
  const [consultGrid, setConsultGrid] = useState<boolean[][]>(
    initialValue?.consult_available_grid || emptyGrid
  );
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        weekly_grid: weeklyGrid,
        consult_available_grid: showConsultAvailability ? consultGrid : undefined,
        date_overrides: initialValue?.date_overrides || {},
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = () => {
    if (activeTab === "general") {
      setWeeklyGrid(emptyGrid);
    } else {
      setConsultGrid(emptyGrid);
    }
  };

  const handleSelectAll = () => {
    const fullGrid = Array(7).fill(null).map(() => Array(slotCount).fill(true));
    if (activeTab === "general") {
      setWeeklyGrid(fullGrid);
    } else {
      setConsultGrid(fullGrid);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Availability</CardTitle>
        <CardDescription>
          Select the times when you are generally available each week.
          {showConsultAvailability && " Use the tabs to switch between general and consult availability."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showConsultAvailability ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="general">General Availability</TabsTrigger>
              <TabsTrigger value="consults">Consult Availability</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="mt-4">
              <When2MeetGrid value={weeklyGrid} onChange={setWeeklyGrid} />
            </TabsContent>
            <TabsContent value="consults" className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Mark times when you&apos;re available for 1:1 consult sessions.
                These times will be used to generate bookable consult slots.
              </p>
              <When2MeetGrid
                value={weeklyGrid}
                onChange={setWeeklyGrid}
                consultMode
                consultValue={consultGrid}
                onConsultChange={setConsultGrid}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <When2MeetGrid value={weeklyGrid} onChange={setWeeklyGrid} />
        )}

        <div className="flex gap-2 justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClearAll}>
              Clear All
            </Button>
            <Button variant="outline" onClick={handleSelectAll}>
              Select All
            </Button>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Availability"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
