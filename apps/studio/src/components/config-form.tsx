"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MODEL_CATALOG, getModelsByGroup } from "@/lib/model-catalog";

export function ConfigForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    userId: "agent-001",
    model: "openai/gpt-4o",
    apiKey: "",
    feishuAppId: "",
    feishuAppSecret: "",
    feishuEncryptKey: "",
    feishuVerificationToken: "",
    feishuDomain: "feishu",
    feishuConnectionMode: "websocket",
    whatsappToken: "",
  });

  const modelGroups = getModelsByGroup();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Construct openclaw.json structure
      const openclawConfig = {
        agents: {
          defaults: {
            model: { primary: formData.model },
          }
        },
        channels: {
          // Only add channels if keys are provided
          ...(formData.feishuAppId && {
            feishu: {
              appId: formData.feishuAppId,
              appSecret: formData.feishuAppSecret,
              encryptKey: formData.feishuEncryptKey || undefined,
              verificationToken: formData.feishuVerificationToken || undefined,
              domain: formData.feishuDomain,
              connectionMode: formData.feishuConnectionMode,
              enabled: true,
            }
          }),
          ...(formData.whatsappToken && {
            whatsapp: {
              token: formData.whatsappToken,
              enabled: true,
            }
          })
        }
      };

      // Construct ENV vars
      // We check for provider prefixes or known model names
      const model = formData.model.toLowerCase();
      const isOpenAI = model.startsWith("openai/") || model.includes("gpt") || model.includes("o1");
      const isAnthropic = model.startsWith("anthropic/") || model.includes("claude");
      const isGoogle = model.startsWith("google/") || model.includes("gemini");

      const env = {
        ...(isOpenAI ? { OPENAI_API_KEY: formData.apiKey } : {}),
        ...(isAnthropic ? { ANTHROPIC_API_KEY: formData.apiKey } : {}),
        ...(isGoogle ? { GEMINI_API_KEY: formData.apiKey } : {}),
        // Add others as needed
      };

      const res = await fetch("/api/instances/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: formData.userId,
          env,
          openclawConfig
        })
      });

      if (!res.ok) {throw new Error("Launch failed");}
      
      const data = await res.json();
      console.log("Launched:", data);
      alert(`Agent ${formData.userId} launched successfully! Container ID: ${data.containerId}`);
    } catch (error) {
      console.error(error);
      alert("Failed to launch agent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Launch New Agent</CardTitle>
        <CardDescription>Configure your agent instance and connect channels.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">Agent ID</Label>
            <Input id="userId" name="userId" value={formData.userId} onChange={handleChange} required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select id="model" name="model" value={formData.model} onChange={handleChange} required>
              {Object.entries(modelGroups).map(([group, models]) => (
                <optgroup key={group} label={group}>
                  {models.map((m) => (
                    <option key={m.id} value={m.provider === 'openai' || m.provider === 'anthropic' || m.provider === 'google' ? `${m.provider}/${m.id}` : m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">LLM API Key</Label>
            <Input id="apiKey" name="apiKey" type="password" value={formData.apiKey} onChange={handleChange} placeholder="sk-..." required />
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-2">Feishu / Lark Integration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feishuAppId">App ID</Label>
                <Input id="feishuAppId" name="feishuAppId" value={formData.feishuAppId} onChange={handleChange} placeholder="cli_..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feishuAppSecret">App Secret</Label>
                <Input id="feishuAppSecret" name="feishuAppSecret" type="password" value={formData.feishuAppSecret} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feishuEncryptKey">Encrypt Key (Optional)</Label>
                <Input id="feishuEncryptKey" name="feishuEncryptKey" type="password" value={formData.feishuEncryptKey} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feishuVerificationToken">Verification Token (Optional)</Label>
                <Input id="feishuVerificationToken" name="feishuVerificationToken" type="password" value={formData.feishuVerificationToken} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feishuDomain">Domain</Label>
                <Select id="feishuDomain" name="feishuDomain" value={formData.feishuDomain} onChange={handleChange}>
                  <option value="feishu">Feishu (China)</option>
                  <option value="lark">Lark (Global)</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feishuConnectionMode">Connection Mode</Label>
                <Select id="feishuConnectionMode" name="feishuConnectionMode" value={formData.feishuConnectionMode} onChange={handleChange}>
                  <option value="websocket">WebSocket</option>
                  <option value="webhook">Webhook</option>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-2">WhatsApp Integration</h3>
            <div className="space-y-2">
              <Label htmlFor="whatsappToken">WhatsApp Token</Label>
              <Input id="whatsappToken" name="whatsappToken" type="password" value={formData.whatsappToken} onChange={handleChange} />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Launching..." : "Launch Agent Instance"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
