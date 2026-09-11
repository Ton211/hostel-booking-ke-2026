import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Bed } from 'lucide-react';
import toast from 'react-hot-toast';

import ProgressBar from '../../components/student/ProgressBar';
import GenderSelector from '../../components/student/GenderSelector';
import AccommodationSelector from '../../components/student/AccommodationSelector';
import RoomSelector from '../../components/student/RoomSelector';
import BedSelector from '../../components/student/BedSelector';
import StudentDetailsForm, { validateStudentDetails } from '../../components/student/StudentDetailsForm';
import BookingSummary from '../../components/student/BookingSummary';
import BookingConfirmation from '../../components/student/BookingConfirmation';

import { getType } from '../../services/accommodationService';
import { createBooking } from '../../services/bookingService';
import { getActiveSemester } from '../../services/semesterService';

import { signInAnonymously } from 'firebase/auth';
import { auth, firebaseReady } from '../../firebase/config';

const STEPS = ['Gender', 'Accommodation', 'Room', 'Bed', 'Details', 'Payment', 'Confirmation'];

export default function BookingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const [gender, setGender] = useState(null);
  const [accommodationTypeId, setAccommodationTypeId] = useState(null);
  const [accommodationType, setAccommodationType] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);
  const [details, setDetails] = useState({
    fullName: '',
    gender: '',
    phoneNumber: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    mpesaPhone: '',
  });
  const [detailsErrors, setDetailsErrors] = useState({});

  const [semester, setSemester] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [confirmationData, setConfirmationData] = useState(null);

  useEffect(() => {
    async function fetchSemester() {
      try {
        const sem = await getActiveSemester();
        setSemester(sem);
      } catch {
        // Semester is optional for display
      }
    }
    fetchSemester();
  }, []);

  useEffect(() => {
    setDetails((prev) => ({ ...prev, gender }));
  }, [gender]);

  useEffect(() => {
    if (accommodationTypeId) {
      getType(accommodationTypeId)
        .then(setAccommodationType)
        .catch(() => setAccommodationType(null));
    }
  }, [accommodationTypeId]);

  function goNext() {
    if (currentStep === 0 && !gender) {
      toast.error('Please select your gender');
      return;
    }
    if (currentStep === 1 && !accommodationTypeId) {
      toast.error('Please select an accommodation type');
      return;
    }
    if (currentStep === 2 && !selectedRoom) {
      toast.error('Please select a room');
      return;
    }
    if (currentStep === 3 && !selectedBed) {
      toast.error('Please select a bed');
      return;
    }
    if (currentStep === 4) {
      const { errors, isValid } = validateStudentDetails(details);
      setDetailsErrors(errors);
      if (!isValid) {
        toast.error('Please fix the form errors');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function goBack() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  function handleGenderSelect(value) {
    setGender(value);
    setSelectedRoom(null);
    setSelectedBed(null);
  }

  function handleAccommodationSelect(id) {
    setAccommodationTypeId(id);
    setSelectedRoom(null);
    setSelectedBed(null);
  }

  function handleRoomSelect(room) {
    setSelectedRoom(room);
    setSelectedBed(null);
  }

  function handleBedSelect(bed) {
    setSelectedBed(bed);
  }

  async function handlePayment() {
    setPaymentLoading(true);
    setPaymentError(null);

    try {
      if (!firebaseReady || !auth) {
        throw new Error('The booking system is not configured yet. Please contact the administrator.');
      }

      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const payload = {
        studentName: details.fullName,
        studentEmail: '',
        studentPhone: details.mpesaPhone || details.phoneNumber,
        studentGender: gender,
        studentIdNumber: '',
        bedId: selectedBed.id,
        roomId: selectedRoom.id,
        hostelId: selectedRoom.hostelId,
        accommodationTypeId,
      };

      const result = await createBooking(payload);

      setConfirmationData({
        ...result,
        studentName: details.fullName,
        studentPhone: details.mpesaPhone || details.phoneNumber,
        accommodationType: accommodationType?.name,
        roomName: selectedRoom.name,
        bedName: `Bed ${selectedBed.bedNumber || selectedBed.name}`,
        bedPosition: selectedBed.position || '',
      });

      setCurrentStep(6);
      toast.success('Booking created successfully!');
    } catch (err) {
      const message = err.message || 'Failed to create booking. Please try again.';
      setPaymentError(message);
      toast.error(message);
    } finally {
      setPaymentLoading(false);
    }
  }

  function handleBackToHome() {
    navigate('/');
  }

  function renderStep() {
    switch (currentStep) {
      case 0:
        return <GenderSelector selected={gender} onSelect={handleGenderSelect} />;
      case 1:
        return <AccommodationSelector selected={accommodationTypeId} onSelect={handleAccommodationSelect} />;
      case 2:
        return (
          <RoomSelector
            gender={gender}
            accommodationTypeId={accommodationTypeId}
            selected={selectedRoom?.id}
            onSelect={handleRoomSelect}
          />
        );
      case 3:
        return (
          <BedSelector
            roomId={selectedRoom?.id}
            selected={selectedBed?.id}
            onSelect={handleBedSelect}
            semesterId={semester?.id}
          />
        );
      case 4:
        return (
          <StudentDetailsForm
            data={details}
            onChange={setDetails}
            errors={detailsErrors}
          />
        );
      case 5:
        return (
          <BookingSummary
            bookingData={{
              gender,
              accommodationType,
              room: selectedRoom,
              bed: selectedBed,
              details,
            }}
            onPay={handlePayment}
            loading={paymentLoading}
            error={paymentError}
          />
        );
      case 6:
        return (
          <BookingConfirmation
            confirmationData={confirmationData}
            onBackToHome={handleBackToHome}
          />
        );
      default:
        return null;
    }
  }

  const showNavigation = currentStep < 5;
  const showBack = currentStep > 0 && currentStep < 6;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {currentStep > 0 && currentStep < 6 && (
            <button
              onClick={goBack}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Bed className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-gray-800 text-sm">Book a Bed</span>
          </div>
          {currentStep < 6 && (
            <span className="ml-auto text-xs text-gray-400">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4">
        <ProgressBar steps={STEPS} currentStep={currentStep} />
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {renderStep()}
      </main>

      {showNavigation && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            {showBack && (
              <button
                onClick={goBack}
                className="flex items-center gap-1 px-5 py-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {currentStep < 5 && (
              <button
                onClick={goNext}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-200 ${
                  !showBack ? 'ml-auto' : ''
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
