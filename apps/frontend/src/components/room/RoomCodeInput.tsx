import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface RoomCodeInputProps {
  isOpen: boolean;
  onJoin: (code: string) => void;
  isLoading?: boolean;
  error?: string;
  onClose?: () => void;
}

export function RoomCodeInput({ isOpen, onJoin, isLoading, error, onClose }: RoomCodeInputProps) {
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setLocalError('Please enter a room code');
      return;
    }
    
    if (!/^\d{6}$/.test(code.trim())) {
      setLocalError('Room code must be 6 digits');
      return;
    }
    
    setLocalError('');
    onJoin(code.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setLocalError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-[425px] crt-scanlines">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl neon-text">
            Join Room
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the 6-digit room code to join the game
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right font-body">
                Code
              </Label>
              <div className="col-span-3">
                <Input
                  id="code"
                  value={code}
                  onChange={handleInputChange}
                  className="col-span-3 font-body text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  disabled={isLoading}
                />
                {(localError || error) && (
                  <p className="text-sm text-destructive mt-1 font-body">
                    {localError || error}
                  </p>
                )}
              </div>
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
              className="font-body font-semibold"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? 'Joining...' : 'Join Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
