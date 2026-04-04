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

interface RoomCodeInputProps {
  isOpen: boolean;
  onJoin: (code: string) => void;
  isLoading?: boolean;
  error?: string;
  onClose?: () => void;
}

export function RoomCodeInput({
  isOpen,
  onJoin,
  isLoading,
  error,
  onClose,
}: RoomCodeInputProps) {
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setLocalError("Please enter a room code");
      return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
      setLocalError("Room code must be 6 digits");
      return;
    }

    setLocalError("");
    onJoin(code.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    setLocalError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            Enter Room Code
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Type the 6-digit code shared by your host
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="font-body sr-only">
                Room Code
              </Label>
              <Input
                id="code"
                value={code}
                onChange={handleInputChange}
                className="font-body text-center text-3xl tracking-widest h-14"
                placeholder="000000"
                maxLength={6}
                disabled={isLoading}
              />
              {(localError || error) && (
                <p className="text-sm text-destructive mt-1 font-body text-center">
                  {localError || error}
                </p>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-body">
                Ask the room host for the 6-digit code
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="font-body"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[var(--color-accent)] text-white hover:opacity-90 font-body font-semibold transition-all"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? "Joining..." : "Join Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
