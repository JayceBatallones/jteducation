"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { When2MeetGrid } from "@/components/availability/when2meet-grid";
import { Save } from "lucide-react";

interface AvailabilityClientProps {
  initialGrid: boolean[][];
  saveAvailability: (weeklyGrid: boolean[][]) => Promise<{ error?: string }>;
}

export function AvailabilityClient({ initialGrid, saveAvailability }: AvailabilityClientProps) {
  const [grid, setGrid] = useState<boolean[][]>(initialGrid);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleGridChange = (newGrid: boolean[][]) => {
    setGrid(newGrid);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await saveAvailability(grid);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Availability saved");
        setHasChanges(false);
      }
    } catch {
      toast.error("Failed to save availability");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setGrid(initialGrid);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">My Availability</h1>
          <p className="text-muted-foreground">
            Set your weekly availability for tutoring sessions
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} disabled={loading}>
              Reset
            </Button>
          )}
          <Button onClick={handleSave} disabled={loading || !hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>
            Click and drag to select times when you&apos;re available for classes.
            This helps us match you with the right cohort schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <When2MeetGrid value={grid} onChange={handleGridChange} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Select all times you could potentially attend classes</p>
          <p>• The more availability you provide, the easier it is to find a suitable cohort</p>
          <p>• Content classes are typically 1-2 hours, so select continuous blocks when possible</p>
          <p>• You can update your availability at any time</p>
        </CardContent>
      </Card>
    </div>
  );
}
