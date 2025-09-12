"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MapPin, Shield, AlertCircle, CheckCircle } from 'lucide-react'

interface LocationPermissionModalProps {
  isOpen: boolean
  onClose: () => void
  onGrantPermission: () => void
  onDenyPermission: () => void
}

export default function LocationPermissionModal({
  isOpen,
  onClose,
  onGrantPermission,
  onDenyPermission
}: LocationPermissionModalProps) {
  const [permissionState, setPermissionState] = useState<'checking' | 'prompt' | 'granted' | 'denied'>('checking')

  useEffect(() => {
    if (isOpen) {
      checkLocationPermission()
    }
  }, [isOpen])

  const checkLocationPermission = async () => {
    if (typeof navigator === 'undefined' || !navigator.permissions) {
      setPermissionState('prompt')
      return
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
      setPermissionState(permission.state === 'granted' ? 'granted' : 'prompt')
    } catch (error) {
      console.log('Permission API not supported, showing prompt')
      setPermissionState('prompt')
    }
  }

  const handleGrantPermission = () => {
    setPermissionState('granted')
    onGrantPermission()
  }

  const handleDenyPermission = () => {
    setPermissionState('denied')
    onDenyPermission()
  }

  if (permissionState === 'granted') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Location Access Granted
            </DialogTitle>
            <DialogDescription>
              Thank you! We can now show you nearby items and help you find the best sharing opportunities.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (permissionState === 'denied') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Location Access Denied
            </DialogTitle>
            <DialogDescription>
              No problem! You can still use Tigawane by selecting a city manually. You'll see all items in your chosen area.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose} className="bg-orange-600 hover:bg-orange-700">
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <MapPin className="h-5 w-5" />
            Location Access Needed
          </DialogTitle>
          <DialogDescription>
            To show you nearby items and help you find the best sharing opportunities, we need access to your location.
          </DialogDescription>
        </DialogHeader>
        
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-900">Your Privacy is Protected</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• We only use your location to show nearby items</li>
                    <li>• Your exact location is never stored or shared</li>
                    <li>• You can change this permission anytime in your browser</li>
                    <li>• You can still use the app by selecting a city manually</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-yellow-900">What happens next?</h4>
                  <p className="text-sm text-yellow-800">
                    When you click "Allow Location Access", we'll ask your browser for permission. 
                    <strong> Please click "Allow" or "Yes" in the browser popup</strong> to enable location access.
                  </p>
                  <p className="text-xs text-yellow-700 mt-2">
                    If you don't see a browser popup, check your browser's address bar for a location icon and click it.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleGrantPermission}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Allow Location Access
              </Button>
              <Button
                onClick={handleDenyPermission}
                variant="outline"
                className="flex-1"
              >
                Use City Selection
              </Button>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  )
}
