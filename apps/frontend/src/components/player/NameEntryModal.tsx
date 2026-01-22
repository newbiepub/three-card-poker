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

interface NameEntryModalProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
  isLoading?: boolean;
}

export function NameEntryModal({ isOpen, onSubmit, isLoading }: NameEntryModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    
    if (name.trim().length > 20) {
      setError('Name must be less than 20 characters');
      return;
    }
    
    setError('');
    onSubmit(name.trim());
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px] crt-scanlines">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl neon-text">
            Welcome to Three Card Poker
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter your name to get started with the game
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right font-body">
                Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  className="col-span-3 font-body"
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
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              className="font-body font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Joining...' : 'Join Game'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
