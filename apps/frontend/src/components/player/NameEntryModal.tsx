import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface NameEntryModalProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
  isLoading?: boolean;
}

export function NameEntryModal({
  isOpen,
  onSubmit,
  isLoading,
}: NameEntryModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    if (name.trim().length > 20) {
      setError("Name must be less than 20 characters");
      return;
    }

    setError("");
    onSubmit(name.trim());
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            Pick a Name
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose a display name to play with
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-body">
                Display Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                className="font-body"
                placeholder="Enter your name"
                maxLength={20}
                disabled={isLoading}
              />
              {error && (
                <p className="text-sm text-destructive mt-1 font-body">
                  {error}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              className="w-full bg-[var(--color-accent)] text-white hover:opacity-90 font-body font-semibold transition-all"
              disabled={isLoading}
            >
              {isLoading ? "Starting..." : "Continue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
