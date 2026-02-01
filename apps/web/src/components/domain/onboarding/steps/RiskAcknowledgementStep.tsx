"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface RiskAcknowledgementStepProps {
  accepted: boolean;
  onAcceptChange: (accepted: boolean) => void;
}

const riskPoints = [
  "AI agents can execute actions on your behalf, including modifying files and accessing external services.",
  "While we implement safeguards, AI responses may occasionally be inaccurate or unexpected.",
  "You retain full control and responsibility for the actions performed by your agents.",
];

export function RiskAcknowledgementStep({
  accepted,
  onAcceptChange,
}: RiskAcknowledgementStepProps) {
  return (
    <div className="flex flex-col items-center px-4">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="mb-6"
      >
        <div className="h-16 w-16 rounded-2xl bg-warning/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-warning" />
        </div>
      </motion.div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center space-y-2 mb-6"
      >
        <h2 className="text-2xl font-bold tracking-tight">
          Before We Begin
        </h2>
        <p className="text-muted-foreground max-w-md">
          Please review and acknowledge the following to continue.
        </p>
      </motion.div>

      {/* Risk Points */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-lg mb-8"
      >
        <Card>
          <CardContent className="p-6">
            <ul className="space-y-4">
              {riskPoints.map((point, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex gap-3"
                >
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-medium">{index + 1}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{point}</p>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Acknowledgement Checkbox */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-lg"
      >
        <label
          className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent/5 transition-colors"
        >
          <Checkbox
            id="acknowledge"
            checked={accepted}
            onCheckedChange={onAcceptChange}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor="acknowledge" className="text-sm font-medium cursor-pointer">
              I understand and accept these terms
            </Label>
            <p className="text-xs text-muted-foreground">
              By checking this box, you acknowledge the nature of AI-assisted operations.
            </p>
          </div>
        </label>
      </motion.div>

      {/* Learn More Link */}
      <motion.a
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        href="#"
        className="mt-6 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        Learn more about AI safety
        <ExternalLink className="h-3 w-3" />
      </motion.a>
    </div>
  );
}

export default RiskAcknowledgementStep;
